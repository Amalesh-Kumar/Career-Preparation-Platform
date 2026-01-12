import ResumeAnalyzer from "./components/ResumeAnalyzer";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import your pages
import Home from "./pages/Home";
import About from "./pages/About";
// (your other pages)

// ⬇️ Add this import for resume analyzer
import ResumeAnalyzer from "./components/ResumeAnalyzer";

function App() {
  return (
    <Router>
      <Routes>

        {/* Your previous routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        {/* ⬇️ Add this new route */}
        <Route path="/resume-analyzer" element={<ResumeAnalyzer />} />

      </Routes>
    </Router>
  );
}

export default App;

