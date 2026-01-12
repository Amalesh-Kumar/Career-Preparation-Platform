import React, { useState, useEffect, useRef } from 'react';
import { Upload, Mic, MicOff, MessageSquare, BookOpen, BarChart3, LogOut, Menu, X, Sparkles, Brain, Target, ArrowRight, Zap } from 'lucide-react';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const wsRef = useRef(null);

  const sendWsEvent = (eventPayload, user) => {
  if (!wsRef.current || wsRef.current.readyState !== 1) {
    console.warn("WS not ready");
    return;
  }

  if (!eventPayload.payload) eventPayload.payload = {};
  if (user?.email) eventPayload.payload.user = user.email;

  wsRef.current.send(JSON.stringify(eventPayload));
};


 useEffect(() => {
  const stored = localStorage.getItem("user");
  const hash = window.location.hash.replace("#", "");

  if (stored) {
    const u = JSON.parse(stored);
    setUser(u);
    setIsLoggedIn(true);

    // If user is logged in, go to dashboard or last visited page
    if (hash && hash !== "home" && hash !== "") {
      navigate(hash, { isLoggedIn: true, user: u });
    } else {
      navigate("dashboard", { isLoggedIn: true, user: u });
    }
  } 
  else {
    // ***Show Home page ONLY (do NOT redirect)***
    setIsLoggedIn(false);
    setUser(null);
    navigate("home", { isLoggedIn: false, user: null });
  }
}, []);



  // REAL-TIME DASHBOARD DATA
  const [dashboardStats, setDashboardStats] = useState({
    resumes: 0,
    interviews: 0,
    courses: 0,
    skills: 0,
    activities: []
  });

  // Navigation with history
  const navigate = (page, options = {}) => {
    const nextIsLoggedIn = typeof options.isLoggedIn === 'boolean' ? options.isLoggedIn : isLoggedIn;
    const nextUser = options.user !== undefined ? options.user : user;

    setCurrentPage(page);
    setIsLoggedIn(nextIsLoggedIn);
    if (options.user !== undefined) setUser(nextUser);

    const url = `#${page}`;
    const state = { page, isLoggedIn: nextIsLoggedIn, user: nextUser };
    window.history.pushState(state, '', url);
  };

  // Sync history → state
  useEffect(() => {
    const initialState = { page: currentPage, isLoggedIn, user };
    window.history.replaceState(initialState, '', `#${currentPage}`);

    const onPop = (event) => {
      const st = event.state;
      if (st && st.page) {
        setCurrentPage(st.page);
        setIsLoggedIn(Boolean(st.isLoggedIn));
        setUser(st.user || null);
      } else {
        const hash = window.location.hash.replace('#', '') || 'home';
        setCurrentPage(hash);
      }
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Keep URL synced
  useEffect(() => {
    if (window.location.hash.replace('#', '') !== currentPage) {
      window.history.replaceState({ page: currentPage, isLoggedIn, user }, '', `#${currentPage}`);
    }
  }, [currentPage]);

  // inside App component (or where defined)
const handleLogin = async (email, password) => {
  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setIsLoggedIn(true);
      navigate("dashboard", { isLoggedIn: true, user: data.user });
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Login error");
  }
};

const handleSignup = async (name, email, password) => {
  try {
    const res = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      // after signup, redirect to login
      navigate("login");
      alert("Signup successful — please login");
    } else {
      alert(data.message || "Signup failed");
    }
  } catch (err) {
    console.error(err);
    alert("Signup error");
  }
};



  // LOGOUT
  const handleLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("token");

  setIsLoggedIn(false);
  setUser(null);

  navigate("home", { isLoggedIn: false, user: null });
};


  // 🔥 REAL-TIME WEBSOCKET CONNECTION
  useEffect(() => {
  if (!user) return;

  const socket = new WebSocket("ws://localhost:5000");
  wsRef.current = socket;     // ✅ SAVE WS INSTANCE

  socket.onopen = () => {
    console.log("🟢 WebSocket Connected");

    socket.send(
      JSON.stringify({
        type: "join",
        user: user?.email || null
      })
    );
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    



    if (data.type === "activity") {
  setDashboardStats(prev => ({
    ...prev,
    activities: [data.payload, ...prev.activities].slice(0, 20)
  }));
  return;
}


    if (data.type === "user_stats") {
  setDashboardStats(prev => ({
    ...prev,
    ...data.payload
  }));
  return;
}


  };

  socket.onclose = () => console.log("🔴 WebSocket Disconnected");
  socket.onerror = (err) => console.error("WebSocket Error:", err);

  return () => socket.close();
}, [user]);


  return (
    <div className="min-h-screen w-full bg-[#0F0F15] relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-70"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),
            radial-gradient(circle 600px at 20% 30%, rgba(208,156,250,0.25), transparent 70%),
            radial-gradient(circle 600px at 80% 70%, rgba(236,72,153,0.25), transparent 70%)
          `,
          backgroundSize: "48px 48px, 48px 48px, 100% 100%, 100% 100%",
        }}
      ></div>

      {!isLoggedIn ? (
        currentPage === 'home' ? (
          <HomePage setCurrentPage={navigate} />
        ) : currentPage === 'login' ? (
          <LoginPage setCurrentPage={navigate} handleLogin={handleLogin} />
        ) : (
          <SignupPage setCurrentPage={navigate} handleSignup={handleSignup} />
        )
      ) : (
        <Dashboard
  currentPage={currentPage}
  setCurrentPage={navigate}
  user={user}
  handleLogout={handleLogout}
  dashboardStats={dashboardStats}
  sidebarOpen={sidebarOpen}
  setSidebarOpen={setSidebarOpen}
  sendWsEvent={sendWsEvent}
/>

      )}
    </div>
  );
};

//------------------------------------------------------
// HOME PAGE + LOGIN + SIGNUP + DASHBOARD WRAPPER
//------------------------------------------------------

const LoopingTypingText = () => {
  const phrases = [
    "With AI HireFlow",
    "With Resume Optimization",
    "With Smart Mock Interviews",
    "With Career Growth"
  ];

  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    const speed = isDeleting ? 50 : 120;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currentPhrase.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);

        if (charIndex + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), 500);
        }
      } else {
        setText(currentPhrase.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);

        if (charIndex - 1 === 0) {
          setIsDeleting(false);
          setPhraseIndex((phraseIndex + 1) % phrases.length);
        }
      }
    }, speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex]);

  return (
    <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
      {text}
      <span className="border-r-4 border-pink-400 animate-pulse ml-1"></span>
    </span>
  );
};

const HomePage = ({ setCurrentPage }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen">
      
      {/* NAVBAR */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-slate-900/95 backdrop-blur-lg shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">HireFlow</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => setCurrentPage('login')} className="text-gray-300 hover:text-white transition px-4 py-2">Login</button>
            <button onClick={() => setCurrentPage('signup')} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition transform hover:scale-105">Get Started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-8">

          <div className="inline-flex items-center space-x-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300 text-sm">AI-Powered Career Growth</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight">
            Transform Your Career<br />
            <LoopingTypingText />
          </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Leverage cutting-edge AI technology to analyze your resume, practice interviews, discover personalized courses, and accelerate your professional growth.
          </p>

          <button
            onClick={() => setCurrentPage('signup')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transition transform hover:scale-105 flex items-center space-x-2 mx-auto"
          >
            <span>Start Free Trial</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-6 bg-black/20">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Powerful Features for Your Success</h2>
            <p className="text-xl text-gray-400">Everything you need to excel in your career journey</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Upload, title: 'Resume Analyzer', desc: 'AI-powered analysis with actionable feedback', color: 'from-blue-500 to-cyan-500' },
              { icon: Mic, title: 'Mock Interviews', desc: 'Practice with AI interviewer and get instant feedback', color: 'from-purple-500 to-pink-500' },
              { icon: BookOpen, title: 'Smart Courses', desc: 'Personalized course recommendations', color: 'from-orange-500 to-red-500' },
              { icon: MessageSquare, title: 'AI Chatbot', desc: '24/7 career guidance and support', color: 'from-green-500 to-emerald-500' }
            ].map((f, i) => (
              <div
                key={i}
                onClick={() => setCurrentPage('login')}
                className="p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 cursor-pointer"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${f.color} rounded-xl flex items-center justify-center mb-4`}>
                  <f.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-white">{f.title}</h3>
                <p className="text-gray-400 mt-2">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm rounded-3xl p-12 border border-purple-500/20">
          <Zap className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Level Up Your Career?</h2>
          <p className="text-xl text-gray-300 mb-8">Join thousands of professionals who trust HireFlow</p>
          
          <button
            onClick={() => setCurrentPage('signup')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:shadow-2xl transition transform hover:scale-105"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black/30 backdrop-blur-xl border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* BRAND */}
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">HireFlow</h3>
            <p className="text-gray-400 mt-3 text-sm">AI-powered tools to help accelerate your career growth.</p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="hover:text-white cursor-pointer">Resume Analyzer</li>
              <li className="hover:text-white cursor-pointer">Mock Interview</li>
              <li className="hover:text-white cursor-pointer">AI Chatbot</li>
              <li className="hover:text-white cursor-pointer">Courses</li>
            </ul>
          </div>

          {/* SUPPORT */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="hover:text-white cursor-pointer">Help Center</li>
              <li className="hover:text-white cursor-pointer">Privacy Policy</li>
              <li className="hover:text-white cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-white cursor-pointer">Refund Policy</li>
            </ul>
          </div>

          {/* CONTACT */}
          <div>
            <h4 className="text-white font-semibold mb-4">Connect With Us</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Email: support@hireflow.ai</li>
              <li>Phone: +91 98765 43210</li>
            </ul>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm py-6 border-t border-white/10">
          © {new Date().getFullYear()} HireFlow. All rights reserved.
        </div>
      </footer>

      <OwlAssistant setCurrentPage={setCurrentPage} />
    </div>
  );
};


const LoginPage = ({ setCurrentPage, handleLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = e => {
    e.preventDefault();
    if (email && password) handleLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-gray-400">Login to continue</p>
        </div>

        <form onSubmit={submit} className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 space-y-6">
          <div>
            <label className="block text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              required
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              required
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:scale-105 transition">
            Sign In
          </button>

          <p className="text-center text-gray-400">
            No account?
            <button className="text-purple-400 ml-1" onClick={() => setCurrentPage('signup')}>Sign up</button>
          </p>
        </form>
      </div>
    </div>
  );
};

const SignupPage = ({ setCurrentPage, handleSignup }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = e => {
    e.preventDefault();
    if (name && email && password) handleSignup(name, email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400">Unlock AI career tools</p>
        </div>

        <form onSubmit={submit} className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 space-y-6">
          <div>
            <label className="block text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white"
            />
          </div>

          <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:scale-105 transition">
            Create Account
          </button>

          <p className="text-center text-gray-400">
            Already have one?
            <button className="text-purple-400 ml-1" onClick={() => setCurrentPage('login')}>Login</button>
          </p>
        </form>
      </div>
    </div>
  );
};

//------------------------------------------------------
// DASHBOARD WRAPPER (Sidebar + Header)
//------------------------------------------------------

const Dashboard = ({ currentPage, setCurrentPage, user, handleLogout, dashboardStats, sidebarOpen, setSidebarOpen, sendWsEvent}) => {
  return (
    <div className="min-h-screen flex">
      
      {/* SIDEBAR */}
      <div
  className={`fixed lg:static inset-y-0 left-0 z-50 w-64 h-screen 
  bg-slate-900/60 backdrop-blur-xl border-r border-white/10 
  transform transition-transform duration-300 ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
  }`}
>


        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">HireFlow</span>
          </div>

          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'resume', icon: Upload, label: 'Resume Analyzer' },
            { id: 'interview', icon: Mic, label: 'Mock Interview' },
            { id: 'courses', icon: BookOpen, label: 'Courses' },
            { id: 'chatbot', icon: MessageSquare, label: 'AI Assistant' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                currentPage === item.id ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* USER + LOGOUT */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center space-x-3 mb-4 px-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.[0]}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium truncate">{user?.name}</div>
              <div className="text-gray-400 text-sm truncate">{user?.email}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto">
        
        {/* Top Bar */}
        <div className="bg-slate-900/60 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-white">
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white capitalize">
            {currentPage}
          </h1>
        </div>

        <div className="p-6">
  {currentPage === "dashboard" && (
    <DashboardContent stats={dashboardStats} user={user} />
  )}

  {currentPage === "resume" && <ResumeAnalyzer user={user} sendWsEvent={sendWsEvent} />}
  {currentPage === "interview" && <MockInterview user={user} sendWsEvent={sendWsEvent} />}
  {currentPage === "courses" && <Courses user={user} sendWsEvent={sendWsEvent}/>}
  {currentPage === "chatbot" && <Chatbot user={user} sendWsEvent={sendWsEvent}/>}
</div>

      </div>
    </div>
  );
};

//------------------------------------------------------
// LIVE REAL-TIME DASHBOARD CONTENT
//------------------------------------------------------

const DashboardContent = ({ stats, user }) => {
  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { icon: Upload, label: 'Resumes Analyzed', value: stats.resumes, color: 'from-blue-500 to-cyan-500' },
          { icon: Mic, label: 'Interviews Completed', value: stats.interviews, color: 'from-purple-500 to-pink-500' },
          { icon: BookOpen, label: 'Courses Enrolled', value: stats.courses, color: 'from-orange-500 to-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-gray-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>

        <div className="space-y-4">
          {stats.activities.length === 0 && (
            <p className="text-gray-500">No activity yet</p>
          )}

          {stats.activities.map((a, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
              <a.icon className={`w-5 h-5 ${a.color}`} />
              <div className="flex-1">
                <div className="text-white font-medium">{a.action}</div>
                <div className="text-gray-400 text-sm">{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

//------------------------------------------------------
// RESUME ANALYZER (sends websocket events)
//------------------------------------------------------





const ResumeAnalyzer = ({ user, sendWsEvent}) => {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const fileInputRef = useRef(null);

  // Normalize score to a clean percentage (0–100)
const normalizeScore = (raw) => {
  if (raw === undefined || raw === null) return null;

  // If decimal (0.0 – 1.0)
  if (typeof raw === "number" && raw <= 1) return Math.round(raw * 100);

  // If string like "0.78"
  const n = parseFloat(raw);
  if (!isNaN(n) && n <= 1) return Math.round(n * 100);

  // If string/number like "78" → 78%
  if (!isNaN(n)) return Math.round(n);

  return null;
};

// safe fallback for arrays
const safeArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim() !== "") return [val];
  return [];
};


  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setAnalysis(null);
    }
  };

  const analyzeResume = async () => {
    if (!file) return alert("Please upload a file");

    setAnalyzing(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      // send to backend analyze endpoint (assumes same as you had)
      const res = await fetch("http://localhost:5000/api/analyze", {
  method: "POST",
  headers: {
    "x-user-email": user?.email || "",
    // don't set Content-Type — fetch will set boundary for multipart
  },
  body: formData,
});


      const data = await res.json();
      setAnalysis(data.analysis);

      // send activity event via websocket
      sendWsEvent({
        type: "activity",
        payload: {
          action: "Analyzed Resume",
          time: new Date().toLocaleString(),
          // small helper so frontend display picks an icon and color — backend can ignore or enrich
          iconName: "Upload",
          color: "text-blue-400"
        }
      });

      // also notify backend to increment counter (backend should handle)
      // send increment to backend


      

    } catch (err) {
      console.error(err);
      alert("Error analyzing resume");
    }

    setAnalyzing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Upload Section */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx"
          className="hidden"
        />

        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Upload className="w-10 h-10 text-white" />
        </div>

        <h3 className="text-2xl font-semibold text-white mb-2">Upload Your Resume</h3>
        <p className="text-gray-400 mb-6">Supports PDF, DOC, and DOCX </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg font-semibold"
        >
          Choose File
        </button>

        {file && (
          <div className="mt-6 p-4 bg-white/5 rounded-xl flex items-center justify-between">
            <span className="text-white">{file.name}</span>

            <button
              onClick={analyzeResume}
              disabled={analyzing}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Analyze Resume"}
            </button>
          </div>
        )}
      </div>

      

      {/* Results Section */}
      {analysis && (
        <div className="space-y-6">
          <div className="bg-white/5 p-8 rounded-xl text-center border border-white/10">
  <div className="text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 text-transparent bg-clip-text">
    {normalizeScore(analysis.score)}%
  </div>
  <p className="text-gray-400">Overall Resume Score</p>
</div>


          <Section title="Strengths" list={analysis.strengths} color="text-gray-300" icon="✔" />
          <Section title="Weaknesses" list={analysis.weaknesses} color="text-gray-300" icon="⚠" />
          <Section title="Improvements" list={analysis.improvements} color="text-gray-300" icon="➡" />
          <Section title="Missing Elements" list={analysis.missing_elements} color="text-gray-300" icon="📌" />
          <Section 
  title="Formatting Issues" 
  list={safeArray(analysis.formatting_issues)} 
  color="text-gray-300" 
  icon="📝" 
/>


          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl text-white font-semibold mb-4">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.keywords.map((kw, i) => (
                <span key={i} className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30">
                  {kw}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl text-white font-semibold mb-4">Job Fit Suggestion</h3>
            <p className="text-gray-300">{analysis.job_fit_suggestion}</p>
          </div>
        </div>
      )}
    </div>
  );
};

//------------------------------------------------------
// MOCK INTERVIEW (sends websocket events on completion)
//------------------------------------------------------

const MockInterview = ({ user, sendWsEvent  }) => {

  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setHasRecorded(true);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const analyzeFeedback = () => {
    setAnalyzing(true);

    // simulate server-side analysis; in real app you would upload audio & get analysis
    setTimeout(() => {
      const fakeFeedback = {
        overall: 82,
        categories: [
          { name: 'Communication', score: 85, feedback: 'Clear and articulate responses' },
          { name: 'Technical Knowledge', score: 80, feedback: 'Good understanding of concepts' },
          { name: 'Confidence', score: 78, feedback: 'Maintain steady tone throughout' },
          { name: 'Clarity', score: 88, feedback: 'Excellent explanation skills' }
        ],
        suggestions: [
          'Reduce filler words like "um" and "like"',
          'Provide more specific examples from your experience',
          'Structure answers using STAR method',
          'Take brief pauses before answering to organize thoughts'
        ]
      };

      setFeedback(fakeFeedback);
      setAnalyzing(false);

      // send activity event and increment via websocket
      sendWsEvent({
        type: "activity",
        payload: {
          action: "Completed Mock Interview",
          time: new Date().toLocaleString(),
          icon: "Mic",
          color: "text-purple-400",
          user: user.email
        }
      });

      sendWsEvent({
  type: "increment",
  payload: { key: "interviews", amount: 1, user: user.email }
},user);


    }, 1800);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
        <div className="text-center mb-8">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all ${isRecording ? 'bg-gradient-to-br from-red-500 to-pink-500 animate-pulse' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
            {isRecording ? <MicOff className="w-12 h-12 text-white" /> : <Mic className="w-12 h-12 text-white" />}
          </div>

          <h3 className="text-2xl font-semibold text-white mb-2">
            {isRecording ? 'Recording...' : hasRecorded ? 'Recording Complete' : 'Start Your Mock Interview'}
          </h3>

          {isRecording && <div className="text-4xl font-bold text-white mt-4">{formatTime(recordingTime)}</div>}

          <p className="text-gray-400 mt-2">
            {isRecording ? 'Answer naturally' : hasRecorded ? 'Ready to analyze' : 'Click start to begin recording'}
          </p>
        </div>

        <div className="flex justify-center space-x-4">
          {!isRecording && !hasRecorded && (
            <button onClick={startRecording} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:scale-105 transition flex items-center space-x-2">
              <Mic className="w-5 h-5" />
              <span>Start Recording</span>
            </button>
          )}

          {isRecording && (
            <button onClick={stopRecording} className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-8 py-4 rounded-xl font-semibold hover:scale-105 transition flex items-center space-x-2">
              <MicOff className="w-5 h-5" />
              <span>Stop Recording</span>
            </button>
          )}

          {hasRecorded && !analyzing && !feedback && (
            <button onClick={analyzeFeedback} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:scale-105 transition">
              Analyze Performance
            </button>
          )}
        </div>

        {analyzing && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 text-purple-400">
              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing your interview...</span>
            </div>
          </div>
        )}
      </div>

      {!feedback && (
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-semibold text-white mb-4">Interview Questions</h3>
          <div className="space-y-3">
            {[
              'Tell me about yourself and your background',
              'What are your greatest strengths?',
              'Describe a challenging project you worked on',
              'Where do you see yourself in 5 years?'
            ].map((q, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start space-x-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">{idx + 1}</span>
                  <span className="text-gray-300">{q}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback && (
        <div className="space-y-6">
          <div className="bg-white/5 p-8 rounded-xl text-center border border-white/10">
            <div className="text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 text-transparent bg-clip-text">{feedback.overall}%</div>
            <p className="text-gray-400">Overall Interview Performance</p>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">Performance Breakdown</h3>
            <div className="space-y-4">
              {feedback.categories.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{c.name}</span>
                    <span className="text-purple-400 font-semibold">{c.score}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 mt-2">
                    <div style={{ width: `${c.score}%` }} className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full" />
                  </div>
                  <p className="text-gray-400 text-sm mt-2">{c.feedback}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-semibold text-white mb-4">Improvement Suggestions</h3>
            <ul className="space-y-3">
              {feedback.suggestions.map((s, idx) => (
                <li key={idx} className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-300">{s}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-center space-x-4">
            <button onClick={() => { setHasRecorded(false); setFeedback(null); setRecordingTime(0); }} className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-lg">Try Another Interview</button>
            <button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg">Download Report</button>
          </div>
        </div>
      )}
    </div>
  );
};

///------------------------------------------------------
// COURSES PAGE — Smaller Cards, 3 per row, 15 courses
//------------------------------------------------------

const Courses = ({ user, sendWsEvent  }) => {
  const courses = [
    // 15 total courses
    {
      title: "Mastering Data Structures & Algorithms",
      level: "Intermediate",
      duration: "6 Weeks",
      color: "from-blue-500 to-cyan-500",
      desc: "Crack technical interviews with solid DSA."
    },
    {
      title: "Full Stack Web Development",
      level: "Beginner",
      duration: "8 Weeks",
      color: "from-purple-500 to-pink-500",
      desc: "Frontend + backend + deployment."
    },
    {
      title: "AI & Machine Learning Foundations",
      level: "Advanced",
      duration: "10 Weeks",
      color: "from-green-500 to-emerald-500",
      desc: "Hands-on ML concepts & algorithms."
    },
    {
      title: "AWS Cloud Practitioner",
      level: "Intermediate",
      duration: "5 Weeks",
      color: "from-orange-500 to-red-500",
      desc: "Learn AWS core services & architecture."
    },
    {
      title: "System Design Essentials",
      level: "Advanced",
      duration: "4 Weeks",
      color: "from-teal-500 to-blue-500",
      desc: "Ace system design interview rounds."
    },
    {
      title: "Cybersecurity & Ethical Hacking",
      level: "Beginner",
      duration: "7 Weeks",
      color: "from-red-500 to-yellow-500",
      desc: "Learn modern cyber-security techniques."
    },
    {
      title: "Frontend Development (React)",
      level: "Intermediate",
      duration: "6 Weeks",
      color: "from-indigo-500 to-purple-500",
      desc: "Master React with real projects."
    },
    {
      title: "Backend Development (Node.js)",
      level: "Intermediate",
      duration: "5 Weeks",
      color: "from-lime-500 to-green-500",
      desc: "Build REST APIs and full backend systems."
    },
    {
      title: "DevOps & CI/CD Pipeline",
      level: "Advanced",
      duration: "6 Weeks",
      color: "from-gray-500 to-slate-500",
      desc: "Docker, Kubernetes, Jenkins & automation."
    },
    {
      title: "Android App Development",
      level: "Beginner",
      duration: "8 Weeks",
      color: "from-rose-500 to-pink-500",
      desc: "Build mobile apps with Kotlin."
    },
    {
      title: "iOS Development (Swift)",
      level: "Intermediate",
      duration: "7 Weeks",
      color: "from-yellow-500 to-orange-500",
      desc: "Learn Swift & iOS frameworks."
    },
    {
      title: "ChatGPT Prompt Engineering",
      level: "Beginner",
      duration: "2 Weeks",
      color: "from-cyan-500 to-teal-500",
      desc: "Master effective prompt writing."
    },
    {
      title: "UI/UX Design & Figma",
      level: "Beginner",
      duration: "4 Weeks",
      color: "from-pink-500 to-red-500",
      desc: "Design beautiful user interfaces."
    },
    {
      title: "Blockchain & Web3 Fundamentals",
      level: "Advanced",
      duration: "6 Weeks",
      color: "from-purple-600 to-indigo-600",
      desc: "Learn crypto, smart contracts, Solidity."
    },
    {
      title: "Python Programming Bootcamp",
      level: "Beginner",
      duration: "6 Weeks",
      color: "from-green-600 to-lime-600",
      desc: "Start your coding journey with Python."
    }
  ];

  const enroll = (course) => {
    // courses.enroll
sendWsEvent({
  type: "activity",
  payload: {
    action: `Enrolled in "${course.title}"`,
    time: new Date().toLocaleString(),
    iconName: "BookOpen",
    color: "text-orange-400",
    user: user.email
  }
});

sendWsEvent({
  type: "increment",
  payload: { key: "courses", amount: 1, user: user.email }
},user);


    alert(`Enrolled in: ${course.title}`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">

      <div className="text-center mb-6">
        <h2 className="text-4xl font-bold text-white">Recommended Courses</h2>
        <p className="text-gray-400 mt-2 text-lg">
          15 hand-picked courses to upgrade your skills
        </p>
      </div>

      {/* 3 cards per row */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, idx) => (
          <div
            key={idx}
            className="bg-white/5 backdrop-blur-sm border border-white/10
                       rounded-2xl p-5 hover:scale-[1.03] transition cursor-pointer"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${course.color} 
                            rounded-xl flex items-center justify-center mb-4`}>
              <BookOpen className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-lg font-semibold text-white leading-tight">
              {course.title}
            </h3>

            <p className="text-gray-400 text-sm mt-2">{course.desc}</p>

            <div className="flex items-center space-x-3 mt-3 text-gray-300 text-xs">
              <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/20">{course.level}</span>
              <span className="bg-white/10 px-3 py-1 rounded-lg border border-white/20">{course.duration}</span>
            </div>

            <button
              onClick={() => enroll(course)}
              className="mt-4 w-full bg-gradient-to-r from-purple-600 to-pink-600 
                         text-white py-2 rounded-lg font-semibold text-sm hover:scale-105 transition"
            >
              Enroll Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};



//------------------------------------------------------
// CHATBOT and OWL ASSISTANT
//------------------------------------------------------

const Chatbot = ({ user, sendWsEvent }) => {
  const [messages, setMessages] = useState([{ role: 'assistant', content: "Hello! I'm your AI Career Assistant. How can I help you today?" }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => scrollToBottom(), [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const responses = [
        'I recommend AWS & Azure certifications to boost your profile.',
        'Interview tips: study data structures, practice mock problems, explain out loud.',
        'Use STAR method for behavioral questions: Situation, Task, Action, Result.',
        'To move to senior roles, build lead projects and mentor juniors.'
      ];
      const aiMessage = { role: 'assistant', content: responses[Math.floor(Math.random() * responses.length)] };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);

      // log chatbot use as activity (optional)
      sendWsEvent({
        type: "activity",
        payload: {
          action: "Used AI Chatbot",
          time: new Date().toLocaleString(),
          iconName: "MessageSquare",
          color: "text-green-400"
        }
      });

    }, 1200);
  };

  const quickActions = ['Help me improve my resume', 'Tips for technical interviews', 'Career path suggestions', 'Salary negotiation advice'];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col">
      <div className="bg-white/5 backdrop-blur-sm rounded-t-2xl p-6 border border-white/10 border-b-0">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Career Assistant</h3>
            <p className="text-gray-400 text-sm">Always here to help</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white/5 backdrop-blur-sm border-x border-white/10 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-white/10 text-gray-200 border border-white/10'}`}>
              {m.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 border border-white/10 p-4 rounded-2xl">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="bg-white/5 backdrop-blur-sm rounded-b-2xl p-6 border border-white/10 border-t-0">
        <div className="flex space-x-3">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white" />
          <button type="submit" disabled={!input.trim()} className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50">Send</button>
        </div>
      </form>
    </div>
  );
};

//------------------------------------------------------
// SECTION helper + OWL ASSISTANT + EXPORT
//------------------------------------------------------

const Section = ({ title, list, icon, color }) => (
  <div className="bg-white/5 p-6 rounded-xl border border-white/10">
    <h3 className="text-xl text-white font-semibold mb-4">{title}</h3>
    <ul className={`space-y-2 ${color}`}>
      {list.map((item, i) => <li key={i}>{icon} {item}</li>)}
    </ul>
  </div>
);

const OwlAssistant = ({ setCurrentPage }) => {
  return (
    <div onClick={() => setCurrentPage("chatbot")} className="fixed bottom-6 right-6 cursor-pointer hover:scale-110 transition transform duration-200" title="Chat with our AI Owl">
      <img src="/robo.png" alt="Owl Assistant" className="w-20 drop-shadow-lg animate-bounce" />
    </div>
  );
};

export default App;

