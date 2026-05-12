"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function ParallaxHands() {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const leftX = useTransform(scrollYProgress, [0, 1], [-34, 12]);
  const rightX = useTransform(scrollYProgress, [0, 1], [34, -12]);
  const heartY = useTransform(scrollYProgress, [0, 1], [14, -16]);

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-[280px] w-full max-w-4xl overflow-hidden sm:h-[330px] lg:h-[380px]"
      ref={ref}
    >
      <motion.div
        className="absolute left-0 top-24 w-[47%] sm:top-20"
        style={reduceMotion ? undefined : { x: leftX }}
      >
        <Image
          alt=""
          className="h-auto w-full object-contain"
          height={420}
          src="/assets/main-page-images/hand-left.svg"
          unoptimized
          width={720}
        />
      </motion.div>
      <motion.div
        className="absolute right-0 top-24 w-[47%] sm:top-20"
        style={reduceMotion ? undefined : { x: rightX }}
      >
        <Image
          alt=""
          className="h-auto w-full object-contain"
          height={420}
          src="/assets/main-page-images/hand-right.svg"
          unoptimized
          width={720}
        />
      </motion.div>
      <motion.div
        animate={reduceMotion ? undefined : { scale: [1, 1.025, 1] }}
        className="absolute left-1/2 top-28 w-[28%] max-w-44 -translate-x-1/2 sm:top-24 lg:top-28"
        style={reduceMotion ? undefined : { y: heartY }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          alt=""
          className="h-auto w-full object-contain drop-shadow-[0_18px_28px_rgba(121,42,35,0.18)]"
          height={320}
          src="/assets/main-page-images/heart.svg"
          unoptimized
          width={320}
        />
      </motion.div>
    </div>
  );
}
