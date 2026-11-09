import {createHash,timingSafeEqual} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "@/lib/db";
import {hasDatabaseUrl,databaseSetupMessage} from "@/lib/db-config";

const tokenPattern=/^[a-f\d]{64}$/;
const numberPattern=/^EP-[\dA-Z-]{8,20}$/;
const input=z.object({number:z.string(),token:z.string().regex(tokenPattern),name:z.string().trim().min(2).max(100),phone:z.string().regex(/^\+?[\d\s()-]{10,20}$/),fulfillment:z.enum(["PICKUP","DELIVERY"]),address:z.string().trim().max(300).optional(),notes:z.string().trim().max(500).optional(),items:z.array(z.object({productId:z.string().min(1).max(100),quantity:z.number().int().min(1).max(30)})).min(1).max(30)});

function validCredentials(number:string,token:string){return numberPattern.test(number)&&tokenPattern.test(token)}
function matchesToken(stored:string,token:string){const a=Buffer.from(createHash("sha256").update(token).digest("hex")),b=Buffer.from(stored);return a.length===b.length&&timingSafeEqual(a,b)}

export async function GET(req:Request){
  if(!hasDatabaseUrl())return NextResponse.json({error:databaseSetupMessage},{status:503});
  const url=new URL(req.url),number=url.searchParams.get("number")||"",token=url.searchParams.get("token")||"";
  if(!validCredentials(number,token))return NextResponse.json({error:"No se encontró el pedido."},{status:404});
  const order=await db.order.findUnique({where:{number},select:{number:true,accessTokenHash:true,status:true,customerName:true,phone:true,address:true,fulfillment:true,notes:true,totalCents:true,items:{select:{productId:true,quantity:true}}}});
  if(!order||!matchesToken(order.accessTokenHash,token))return NextResponse.json({error:"No se encontró el pedido."},{status:404});
  return NextResponse.json({number:order.number,status:order.status,customerName:order.customerName,phone:order.phone,address:order.address,fulfillment:order.fulfillment,notes:order.notes,totalCents:order.totalCents,items:order.items});
}

export async function PATCH(req:Request){
  if(!hasDatabaseUrl())return NextResponse.json({error:databaseSetupMessage},{status:503});
  let raw:unknown;try{raw=await req.json()}catch{return NextResponse.json({error:"JSON inválido"},{status:400})}
  const parsed=input.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"Revisa los datos del pedido."},{status:400});const value=parsed.data;
  try{
    const result=await db.$transaction(async tx=>{
      const order=await tx.order.findUnique({where:{number:value.number},include:{items:true,payments:true}});
      if(!order||!matchesToken(order.accessTokenHash,value.token))throw new Error("NOT_FOUND");
      if(!["PENDING_PAYMENT","RECEIVED","PREPARING"].includes(order.status))throw new Error("NOT_EDITABLE");
      if(order.payments.some(payment=>payment.status==="APPROVED"))throw new Error("PAID");
      const settings=await tx.storeSettings.findUnique({where:{id:"store"}});
      if(value.fulfillment==="DELIVERY"&&!settings?.deliveryEnabled)throw new Error("DELIVERY_DISABLED");
      const ids=[...new Set(value.items.map(item=>item.productId))];
      const products=await tx.product.findMany({where:{id:{in:ids},active:true}});if(products.length!==ids.length)throw new Error("PRODUCT_UNAVAILABLE");
      for(const item of order.items){const product=await tx.product.findUnique({where:{id:item.productId},select:{inventory:true}});if(product?.inventory!==null&&product?.inventory!==undefined){await tx.product.update({where:{id:item.productId},data:{inventory:{increment:item.quantity}}});await tx.inventoryMovement.create({data:{productId:item.productId,quantityDelta:item.quantity,reason:"ORDER_EDIT_RELEASED",orderId:order.id}})}}
      const rows=value.items.map(item=>({product:products.find(product=>product.id===item.productId)!,quantity:item.quantity}));
      for(const row of rows)if(row.product.inventory!==null){const changed=await tx.product.updateMany({where:{id:row.product.id,active:true,inventory:{gte:row.quantity}},data:{inventory:{decrement:row.quantity}}});if(changed.count!==1)throw new Error("STOCK");await tx.inventoryMovement.create({data:{productId:row.product.id,quantityDelta:-row.quantity,reason:"ORDER_EDIT_RESERVED",orderId:order.id}})}
      const subtotal=rows.reduce((total,row)=>total+row.product.priceCents*row.quantity,0),delivery=value.fulfillment==="DELIVERY"?(settings?.deliveryFeeCents??0):0;
      await tx.orderItem.deleteMany({where:{orderId:order.id}});
      const updated=await tx.order.update({where:{id:order.id},data:{customerName:value.name,phone:value.phone,address:value.address,fulfillment:value.fulfillment,notes:value.notes,subtotalCents:subtotal,deliveryCents:delivery,totalCents:subtotal+delivery,items:{create:rows.map(row=>({productId:row.product.id,productName:row.product.name,unitPriceCents:row.product.priceCents,quantity:row.quantity}))}}});
      await tx.orderStatusHistory.create({data:{orderId:order.id,fromStatus:order.status,toStatus:order.status,note:"Pedido modificado por el cliente"}});
      return {number:updated.number,status:updated.status,totalCents:updated.totalCents};
    });
    return NextResponse.json(result);
  }catch(e){const code=e instanceof Error?e.message:"";const errors:Record<string,[string,number]>={NOT_FOUND:["No se encontró el pedido.",404],NOT_EDITABLE:["Este pedido ya no admite modificaciones.",409],PAID:["Un pedido pagado no puede modificarse.",409],DELIVERY_DISABLED:["La entrega a domicilio aún no está habilitada.",400],PRODUCT_UNAVAILABLE:["Uno de los productos ya no está disponible.",409],STOCK:["No hay existencias suficientes para completar el cambio.",409]};if(errors[code])return NextResponse.json({error:errors[code][0]},{status:errors[code][1]});console.error("order_edit_failed",code||"unknown");return NextResponse.json({error:"No se pudo actualizar el pedido."},{status:503})}
}
