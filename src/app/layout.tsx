import type { Metadata } from "next";import "./globals.css";import ActiveOrderIndicator from "./active-order-indicator";
export const metadata:Metadata={title:"E-Pan | El sabor de siempre",description:"Panadería mexicana artesanal. Pan dulce, bolillos y antojos recién horneados."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-MX"><body>{children}<ActiveOrderIndicator/></body></html>}
