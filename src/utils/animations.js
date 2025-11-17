// Framer Motion animation variants for consistent animations across the app

export const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

export const slideUp = {
  initial: { y: '100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '100%', opacity: 0 },
  transition: { type: 'spring', damping: 25, stiffness: 300 }
}

export const slideDown = {
  initial: { y: '-100%', opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: '-100%', opacity: 0 },
  transition: { type: 'spring', damping: 25, stiffness: 300 }
}

export const scaleIn = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.8, opacity: 0 },
  transition: { type: 'spring', damping: 20, stiffness: 300 }
}

export const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.98 }
}

export const buttonTap = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.05 },
  transition: { type: 'spring', stiffness: 400, damping: 17 }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
}

export const celebration = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.2, 1],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut'
    }
  }
}

export const numberCounter = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.2 }
}

export const modalBackdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

export const draggable = {
  drag: 'y',
  dragConstraints: { top: 0, bottom: 0 },
  dragElastic: 0.2
}
