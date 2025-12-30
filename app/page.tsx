import CanvasWorkspace from "@/components/CanvasWorkspace";

// Force dynamic rendering to support session context
export const dynamic = 'force-dynamic';

export default function Home() {
  return <CanvasWorkspace />;
}
