import {afterEach,describe,it,expect} from "vitest";import {GET as productsGet} from "../app/api/products/route";import {POST as ordersPost} from "../app/api/orders/route";
afterEach(()=>{delete process.env.DATABASE_URL});
describe("endpoints con PostgreSQL sin configurar",()=>{
 it("devuelve un mensaje accionable para el catálogo",async()=>{delete process.env.DATABASE_URL;const response=await productsGet();expect(response.status).toBe(503);expect((await response.json()).error).toContain("DATABASE_URL")});
 it("rechaza la creación de un pedido válido como fallo de infraestructura, sin simular persistencia",async()=>{delete process.env.DATABASE_URL;const request=new Request("http://localhost/api/orders",{method:"POST",headers:{"content-type":"application/json","idempotency-key":"702a7283-dc54-45ba-a7a1-98d28229f9c8"},body:JSON.stringify({name:"Cliente E-Pan",phone:"5551234567",fulfillment:"PICKUP",items:[{productId:"concha",quantity:2}]})});const response=await ordersPost(request);expect(response.status).toBe(503);expect((await response.json()).error).toContain("DATABASE_URL")});
});
