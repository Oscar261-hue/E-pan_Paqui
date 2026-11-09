import {describe,it,expect} from "vitest";import {productInput,productPatch} from "./admin-validation";
const valid={name:"Concha artesanal",description:"Pan dulce",priceCents:1800,imageUrl:"https://example.com/concha.jpg",categoryId:"cat-1",inventory:4,madeToOrder:false};
describe("validación administrativa de productos",()=>{
 it("acepta datos de producto válidos y precios en centavos",()=>expect(productInput.safeParse(valid).success).toBe(true));
 it("rechaza precios negativos, fraccionarios y URLs sin HTTPS",()=>{expect(productInput.safeParse({...valid,priceCents:-1}).success).toBe(false);expect(productInput.safeParse({...valid,priceCents:1.2}).success).toBe(false);expect(productInput.safeParse({...valid,imageUrl:"http://example.com/x.jpg"}).success).toBe(false)});
 it("acepta stock ilimitado o entero no negativo y rechaza stock inválido",()=>{expect(productInput.safeParse({...valid,inventory:null}).success).toBe(true);expect(productPatch.safeParse({inventory:0}).success).toBe(true);expect(productPatch.safeParse({inventory:-1}).success).toBe(false)});
 it("rechaza un parche vacío",()=>expect(productPatch.safeParse({}).success).toBe(false));
});
