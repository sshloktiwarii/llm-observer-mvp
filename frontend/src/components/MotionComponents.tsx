'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

export function MotionHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.header>
  );
}

export function MotionGrid({
  children,
  className,
  stagger = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1 },
      }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: -6,
        transition: { type: 'spring', stiffness: 350, damping: 22 },
      }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionSection({
  children,
  className,
  delay = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function MotionIconButton({
  children,
  className,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      whileHover={{ scale: 1.12, rotate: 4 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}

export function RedPulseDot({ active = true }: { active?: boolean }) {
  if (!active) {
    return <span className="w-2.5 h-2.5 rounded-full bg-zinc-600 inline-block"></span>;
  }
  return (
    <span className="relative flex h-2.5 w-2.5 inline-flex items-center justify-center">
      <motion.span
        animate={{ scale: [1, 2, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inline-flex h-full w-full rounded-full bg-red-500"
      />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
    </span>
  );
}
