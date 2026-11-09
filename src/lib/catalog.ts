export type Product={id:string;name:string;description:string;price:number;image:string;category:string;badge?:string};
export const products:Product[]=[
 {id:"concha",name:"Concha de vainilla",description:"Suave, esponjosa y cubierta con costra de vainilla.",price:18,image:"https://images.unsplash.com/photo-1509365465985-25d11c17e812?auto=format&fit=crop&w=800&q=80",category:"Pan dulce",badge:"Favorita"},
 {id:"cuernito",name:"Cuernito de mantequilla",description:"Hojaldrado con mantequilla, recién salido del horno.",price:24,image:"https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80",category:"Pan dulce"},
 {id:"oreja",name:"Oreja crujiente",description:"Capas doradas con el punto justo de azúcar.",price:20,image:"https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=800&q=80",category:"Pan dulce"},
 {id:"bolillo",name:"Bolillo tradicional",description:"Corteza crujiente, migajón suave. Ideal para tortas.",price:5,image:"https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&w=800&q=80",category:"Pan blanco"},
 {id:"dona",name:"Dona glaseada",description:"Masa tierna con glaseado clásico hecho en casa.",price:25,image:"https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80",category:"Antojitos",badge:"Recién hecha"},
 {id:"galletas",name:"Galletas de mantequilla",description:"Crujientes por fuera y delicadas por dentro. Paquete de 6.",price:48,image:"https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=800&q=80",category:"Antojitos"},
];
export const categories=["Todo","Pan dulce","Pan blanco","Antojitos","Pasteles"];
export const formatPrice=(value:number)=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",maximumFractionDigits:0}).format(value);
