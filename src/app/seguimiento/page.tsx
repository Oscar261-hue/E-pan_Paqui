import {Suspense} from "react";import TrackingClient from "./tracking-client-v3";
export default function TrackingPage(){return <Suspense fallback={<main className="wrap" style={{padding:"50px 0"}}>Cargando seguimiento…</main>}><TrackingClient/></Suspense>}
