import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.9)']
  );
  const borderOpacity = useTransform(scrollY, [0, 100], [0, 1]);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollY.onChange(value => {
      setIsScrolled(value > 0);
    });
    return () => unsubscribe();
  }, [scrollY]);

  return (
    <motion.nav
      className="fixed top-0 w-full z-50 transition-colors duration-200"
      style={{
        backgroundColor,
        borderBottom: `1px solid rgba(229, 231, 235, ${borderOpacity.get()})`,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center"
          >
            <Link to="/" className="flex items-center space-x-2">
              <img src="/XpressVoice-logo.png" alt="XpressVoice" className="w-8 h-8" />
              <span className="text-xl font-display font-bold text-black">XpressVoice</span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center space-x-8"
          >
            <button
              onClick={() => scrollToSection('features')}
              className="animated-underline text-gray-600 hover:text-primary transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('benefits')}
              className="animated-underline text-gray-600 hover:text-primary transition-colors"
            >
              Benefits
            </button>
            <button
              onClick={() => scrollToSection('use-cases')}
              className="animated-underline text-gray-600 hover:text-primary transition-colors"
            >
              Use Cases
            </button>
            <Link to="/login" className="text-gray-600 hover:text-primary transition-colors">
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-all transform hover:scale-105 hover:shadow-lg"
            >
              Get Started
            </Link>
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{
          height: isOpen ? 'auto' : 0,
          opacity: isOpen ? 1 : 0,
        }}
        className="md:hidden overflow-hidden bg-white border-t border-gray-100"
      >
        <div className="px-4 py-2 space-y-1">
          <button
            onClick={() => {
              scrollToSection('features');
              setIsOpen(false);
            }}
            className="block w-full px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50"
          >
            Features
          </button>
          <button
            onClick={() => {
              scrollToSection('benefits');
              setIsOpen(false);
            }}
            className="block w-full px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50"
          >
            Benefits
          </button>
          <button
            onClick={() => {
              scrollToSection('use-cases');
              setIsOpen(false);
            }}
            className="block w-full px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50"
          >
            Use Cases
          </button>
          <Link
            to="/login"
            className="block px-3 py-2 rounded-md text-gray-600 hover:text-primary hover:bg-gray-50"
            onClick={() => setIsOpen(false)}
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="block px-3 py-2 rounded-md text-white bg-primary hover:bg-primary-dark"
            onClick={() => setIsOpen(false)}
          >
            Get Started
          </Link>
        </div>
      </motion.div>
    </motion.nav>
  );
};

export default Navbar;