import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./App.css";

function App() {
  return (
      <main className="container">
        <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
          Welcome to 
            <code className="bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              3devo-gui
            </code>
            !
        </h1>

        <Input
          placeholder="Enter a name..."
        />
        <Button>Greet</Button>
    </main>
  );
}

export default App;
