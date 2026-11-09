import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {requireStaff} from "@/lib/auth";
import {hasDatabaseUrl,databaseSetupMessage} from "@/lib/db-config";

export async function PATCH(_req:Request,{params}:{params:Promise<{id:string}>}){
  let staff;try{staff=await requireStaff()}catch{return NextResponse.json({error:"No se pudo verificar la sesión administrativa."},{status:503})}
  if(!staff)return NextResponse.json({error:"No autorizado"},{status:401});
  if(!hasDatabaseUrl())return NextResponse.json({error:databaseSetupMessage},{status:503});
  const {id}=await params;
  try{
    const out=await db.$transaction(async tx=>{const order=await tx.order.findUnique({where:{id},select:{status:true}});if(!order)throw new Error("NOT_FOUND");if(order.status!=="PENDING_PAYMENT")throw new Error("TRANSITION");const updated=await tx.order.update({where:{id},data:{status:"RECEIVED"}});await tx.orderStatusHistory.create({data:{orderId:id,fromStatus:order.status,toStatus:"RECEIVED",actorId:staff.id,note:"Pedido recibido por el administrador"}});await tx.auditLog.create({data:{userId:staff.id,action:"ORDER_STATUS_CHANGED",entity:"Order",entityId:id,details:{from:order.status,to:"RECEIVED"}}});return updated});
    return NextResponse.json({status:out.status});
  }catch(e){const code=e instanceof Error?e.message:"";if(code==="NOT_FOUND")return NextResponse.json({error:"Pedido no encontrado."},{status:404});if(code==="TRANSITION")return NextResponse.json({error:"El pedido ya no está pendiente de recepción."},{status:409});console.error("order_receive_failed",e instanceof Error?e.name:"unknown");return NextResponse.json({error:"No se pudo actualizar el pedido."},{status:503})}
}
