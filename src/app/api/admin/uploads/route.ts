import {randomUUID} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import {NextResponse} from "next/server";
import {requireStaff} from "@/lib/auth";

export const runtime="nodejs";

const extensions:Record<string,string>={
  "image/jpeg":".jpg","image/png":".png","image/gif":".gif","image/webp":".webp",
  "image/avif":".avif","image/svg+xml":".svg","image/bmp":".bmp","image/tiff":".tiff",
};

export async function POST(request:Request){
  let staff;
  try{staff=await requireStaff()}catch{return NextResponse.json({error:"No se pudo verificar la sesión administrativa."},{status:503})}
  if(!staff)return NextResponse.json({error:"No autorizado"},{status:401});
  try{
    const form=await request.formData();
    const file=form.get("file");
    if(!(file instanceof File))return NextResponse.json({error:"Selecciona una imagen."},{status:400});
    if(!file.type.startsWith("image/"))return NextResponse.json({error:"El archivo debe ser una imagen."},{status:400});
    if(file.size>10*1024*1024)return NextResponse.json({error:"La imagen no puede superar 10 MB."},{status:400});
    const uploadDir=path.join(process.cwd(),"public","uploads");
    await mkdir(uploadDir,{recursive:true});
    const extension=extensions[file.type]||path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g,"")||".img";
    const filename=`${randomUUID()}${extension}`;
    await writeFile(path.join(uploadDir,filename),Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({url:`/uploads/${filename}`},{status:201});
  }catch(error){
    console.error("admin_image_upload_failed",error instanceof Error?error.name:"unknown");
    return NextResponse.json({error:"No se pudo guardar la imagen."},{status:500});
  }
}
