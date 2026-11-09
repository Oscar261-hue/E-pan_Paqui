"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {ShoppingBag} from "lucide-react";

type SavedOrder={number:string;token:string;status?:string};

export default function ActiveOrderIndicator(){
  const pathname=usePathname();
  const [order,setOrder]=useState<SavedOrder|null>(null);
  useEffect(()=>{try{const saved=localStorage.getItem("epan-active-order");if(saved){const value=JSON.parse(saved);if(value?.number&&value?.token)setOrder(value)}}catch{}},[]);
  if(pathname.startsWith("/admin")||!order)return null;
  return <Link href={`/seguimiento?number=${encodeURIComponent(order.number)}&token=${encodeURIComponent(order.token)}`} aria-label="Ver estado de mi pedido" style={{position:"fixed",right:20,bottom:20,zIndex:30,display:"flex",alignItems:"center",gap:8,background:"var(--coffee)",color:"white",borderRadius:999,padding:"12px 16px",boxShadow:"0 8px 24px #0003",fontWeight:700}}><ShoppingBag size={18}/><span>Pedido {order.number}</span></Link>;
}
