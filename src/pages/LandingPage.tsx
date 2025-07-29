import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Zap,
  Brain,
  Shield,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Bot,
  MessageSquare,
  Headphones,
  BarChart,
  Target,
  Clock,
} from "lucide-react";

/* 
  1) SCROLL PROGRESS (top bar):
     - expands from left to right as you scroll
*/
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
      style={{ scaleX: scrollYProgress }}
    />
  );
}

/* 
  2) CURSOR GLOW: 
     - now smaller (300px instead of 800px)
*/
function CursorGlow() {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      setCursorPos({ x: e.clientX, y: e.clientY });
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className="cursor-glow"
      style={
        {
          "--mouse-x": `${cursorPos.x}px`,
          "--mouse-y": `${cursorPos.y}px`,
          // Reduced radius from 800px to 300px:
          background: `radial-gradient(
          300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
          rgba(132, 204, 22, 0.15),
          transparent 40%
        )`,
        } as React.CSSProperties
      }
    />
  );
}

/* Basic FeatureCard for "Powerful Features" */
type FeatureProps = {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  delay?: number;
};
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  delay = 0,
}: FeatureProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center hover:bg-white/10 hover:shadow-lg transition-all duration-300 border border-white/10 relative group"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-r from-${color}/5 to-${color}/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10 blur-xl`}
      />
      <div className="flex justify-center mb-4">
        <div
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${color}/20 to-${color}/10 dark:from-${color}/30 dark:to-${color}/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
        >
          <Icon className={`w-8 h-8 text-${color}`} />
        </div>
      </div>
      <h4 className="text-xl font-semibold mb-1">{title}</h4>
      <p className="text-gray-300 text-sm">{description}</p>
    </motion.div>
  );
}

// Example placeholder data for the three features
const features = [
  {
    icon: Zap,
    title: "Lightning-Fast Performance",
    description: "Instant responses with our optimized AI engine",
    color: "primary",
  },
  {
    icon: Brain,
    title: "Advanced AI",
    description: "State-of-the-art LLMs for human-like conversations",
    color: "primary",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-grade encryption and compliance built-in",
    color: "primary",
  },
];

// Paths for "Why EchoMind"
const wiresPaths = [
  "M500 250 L500 100",
  "M500 400 L150 200",
  "M500 400 L850 200",
  "M500 400 L150 600",
  "M500 400 L850 600",
  "M500 400 L500 700",
];

// Simple fade/stagger variants
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.15 },
  },
};
const childVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" },
  },
};

/* FeatureBox for "Why EchoMind" circular layout */
function FeatureBox({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 group transform hover:scale-105 transition-all duration-300">
      <div className="bg-primary/10 p-6 rounded-2xl group-hover:bg-primary/20 transition-colors duration-300 shadow-lg shadow-primary/5">
        {icon}
      </div>
      <p className="text-base font-medium text-center font-lato group-hover:text-primary transition-colors duration-300">
        {text}
      </p>
    </div>
  );
}

export default function LandingPage() {
  const [isOpen, setIsOpen] = useState(false);

  // Sticky Nav Logic
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(24,24,27,0)", "rgba(24,24,27,0.8)"],
  );
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <div className="min-h-screen bg-dark-300 text-white overflow-hidden relative">
      {/* 1) Scroll Progress */}
      <ScrollProgress />

      {/* 2) Cursor Glow */}
      <CursorGlow />

      {/* NAVBAR */}
      <motion.nav
        className="fixed top-0 w-full z-50 backdrop-blur-sm"
        style={{
          backgroundColor,
          borderBottom: `1px solid rgba(255,255,255,${
            borderOpacity.get() * 0.1
          })`,
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="relative">
                <div className="h-10 px-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center group-hover:shadow-lg transition-all duration-300">
                  <img
                    src="/full-logo.png"
                    alt="Allied Global"
                    className="h-6 w-auto"
                  />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-primary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/login"
                className="font-lato font-bold text-gray-300 hover:text-primary"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="font-lato font-bold px-4 py-2 rounded-lg bg-primary hover:bg-primary-600 text-white transition transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {isOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
          className="md:hidden overflow-hidden bg-dark-200/80 backdrop-blur-sm border-t border-white/10"
        >
          <div className="px-4 py-2 space-y-1">
            <Link
              to="/login"
              className="block w-full px-4 py-2 text-center font-lato font-bold text-gray-300 hover:text-primary"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="block w-full px-4 py-2 text-center font-lato font-bold text-white bg-primary hover:bg-primary-600 rounded-lg"
              onClick={() => setIsOpen(false)}
            >
              Get Started
            </Link>
          </div>
        </motion.div>
      </motion.nav>

      {/* HERO SECTION */}
      <div className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          {/* Hero Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-noto-sans font-bold tracking-tight"
          >
            <span className="block mb-2">Next-Gen</span>
            <span className="inline-block text-primary">Voice AI</span>
            <span className="block mt-2">for Your Business</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl text-gray-400 max-w-3xl mx-auto font-lato mt-8 mb-8 leading-relaxed"
          >
            Build advanced voice agents that interact naturally and deliver
            <span className="relative mx-2 inline-flex">
              <span className="absolute inset-0 bg-primary/10 blur rounded-lg" />
              <span className="relative text-primary font-bold">
                lightning-fast
              </span>
            </span>
            responses—deploy in minutes, scale infinitely.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            className="flex flex-col md:flex-row justify-center items-center gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link
              to="/signup"
              className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-bold text-lg transition-all duration-300 overflow-hidden hover:shadow-2xl hover:shadow-primary/20 hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center">
                <span>Get Started</span>
                <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* LIVE WAVE SECTION: LIME GREEN, translucent inner background */}
      <section className="py-12 relative overflow-hidden">
        {/* The wave gradient behind everything */}
        <div className="absolute inset-0 z-[-1] bg-gradient-to-r from-[#86dc3d] via-[#84cc16] to-[#65a30d] animate-gradientWave" />

        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-bold mb-4">
              Build, Deploy, and Scale
              <span className="text-primary mx-2">Voice Agents</span>
              in Minutes
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Build intelligent voice agents that understand context and handle
              complex conversations. From customer support to virtual
              assistants, transform your business communication.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-gray-400">5-Minute Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-gray-400">Enterprise Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-gray-400">Infinite Scale</span>
              </div>
            </div>
          </motion.div>

          {/* The translucent, lime-green container for the bars */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative max-w-3xl mx-auto bg-primary/10 backdrop-blur-sm rounded-xl p-6 shadow-lg shadow-primary/10 overflow-hidden"
          >
            {/* The wave bars */}
            <div className="flex items-end justify-center h-20 gap-1">
              {[...Array(60)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-primary/70 rounded-full"
                  animate={{
                    height: [
                      Math.random() * 20 + 10,
                      Math.random() * 60 + 20,
                      Math.random() * 20 + 10,
                    ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.02,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Some glow behind the bars */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-transparent -z-10 blur-[120px] rounded-[80px]" />
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-8 bg-primary/10 -z-20 blur-3xl rounded-full"
            />
          </motion.div>
        </div>
      </section>

      {/* POWERFUL FEATURES SECTION */}
      <section className="py-12 relative">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-3xl font-noto-sans font-bold mb-4">
              Powerful Features for
              <span className="bg-gradient-to-r from-primary to-primary-400 bg-clip-text text-transparent ml-2">
                Modern Businesses
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Future-proof your customer interaction with robust, scalable AI
              capabilities.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {features.map((f, i) => (
              <motion.div key={f.title} variants={childVariants}>
                <FeatureCard {...f} delay={i * 0.2} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* WHY ECHOMIND SECTION - Tighter circle & bigger logo */}
      <section className="py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10 relative"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary mr-2" />
              <span className="text-primary text-sm font-semibold font-lato">
                Why EchoMind
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-noto-sans mb-4">
              Unleash the Power of{" "}
              <span className="bg-gradient-to-r from-primary to-primary-400 bg-clip-text text-transparent">
                Intelligent Voice
              </span>
            </h2>
            <p className="text-lg text-gray-300 max-w-xl mx-auto font-lato">
              Harness cutting-edge voice and language models, integrated to
              elevate user interactions, boost productivity, and deliver
              outstanding customer experiences.
            </p>
          </motion.div>

          {/* Features Circle Layout */}
          <div className="relative mx-auto w-[600px] h-[600px]">
            {/* Center Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              {/* Logo Background */}
              <div className="w-[180px] h-[180px] backdrop-blur-md rounded-2xl relative">
                {/* Enhanced glow effects */}
                <div className="absolute inset-0 bg-primary/30 rounded-2xl blur-3xl" />
                <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-2xl animate-pulse" />
                <div className="absolute -inset-8 bg-primary/10 rounded-full blur-3xl animate-pulse" />
              </div>
              {/* Logo Container */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-36 h-36">
                  <div className="absolute inset-0 bg-primary/40 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl" />
                  <img
                    src="/full-logo.png"
                    alt="Allied Global"
                    className="relative w-auto h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="absolute inset-0">
              {/* Top */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <FeatureBox
                  icon={<Bot className="w-8 h-8 text-primary" />}
                  text="Advanced Voice & NLP"
                />
              </div>

              {/* Top Right */}
              <div className="absolute top-[25%] right-0">
                <FeatureBox
                  icon={<MessageSquare className="w-8 h-8 text-primary" />}
                  text="Multi-Channel Support"
                />
              </div>

              {/* Bottom Right */}
              <div className="absolute bottom-[25%] right-0">
                <FeatureBox
                  icon={<Headphones className="w-8 h-8 text-primary" />}
                  text="24/7 Automated CX"
                />
              </div>

              {/* Bottom */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <FeatureBox
                  icon={<Target className="w-8 h-8 text-primary" />}
                  text="Personalized Experience"
                />
              </div>

              {/* Bottom Left */}
              <div className="absolute bottom-[25%] left-0">
                <FeatureBox
                  icon={<BarChart className="w-8 h-8 text-primary" />}
                  text="Real-Time Analytics"
                />
              </div>

              {/* Top Left */}
              <div className="absolute top-[25%] left-0">
                <FeatureBox
                  icon={<Clock className="w-8 h-8 text-primary" />}
                  text="Quick Setup & Scale"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* CTA SECTION */}
      <section className="py-12 text-center">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto px-4"
        >
          <h2 className="text-3xl font-noto-sans font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-gray-400 mb-6 font-lato">
            Join thousands of businesses using Allied Global to transform their
            customer interactions.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Link
              to="/signup"
              className="group relative px-6 py-3 rounded-xl bg-primary hover:bg-primary-600 text-white font-semibold transition-all duration-300 inline-flex items-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center">
                <span>Start Free Trial</span>
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
