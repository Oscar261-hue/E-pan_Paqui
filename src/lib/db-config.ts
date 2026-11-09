export function hasDatabaseUrl(){
  const databaseUrl=process.env.DATABASE_URL?.trim()??"";
  if(!databaseUrl||databaseUrl.includes("USER:PASSWORD"))return false;
  if(databaseUrl.startsWith("file:"))return true;
  try{
    const parsed=new URL(databaseUrl);
    return ["postgres:","postgresql:"].includes(parsed.protocol)&&Boolean(parsed.hostname&&parsed.username);
  }catch{return false}
}
export const databaseSetupMessage="Base de datos no configurada. Define DATABASE_URL en .env y reinicia Next.js.";
