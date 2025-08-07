import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Drawing QC Application
        </h1>
        <div className="text-center">
          <p className="text-lg mb-4">
            Your Drawing Quality Control application is being modernized with React + TypeScript!
          </p>
          <button 
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90 transition-colors"
            onClick={() => setCount((count) => count + 1)}
          >
            Count is {count}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;