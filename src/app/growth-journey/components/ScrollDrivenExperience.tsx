"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ReactLenis from "@studio-freight/react-lenis";
import "./ScrollDrivenExperience.css";

// Mock data for Growth Journey stages
const journeyStages = [
  {
    id: 0,
    slug: "intention-setting",
    title: "Setting Intentions",
    description: "A gentle beginning to clarify your journey ahead.",
    images: [
      "/project-1-1.jpg",
      "/project-1-2.jpg",
      "/project-1-3.jpg",
      "/project-1-4.jpg",
      "/project-1-5.jpg",
    ],
  },
  {
    id: 1,
    slug: "inner-reflection",
    title: "Inner Reflection",
    description: "Diving deep into the landscapes of your inner world.",
    images: [
      "/project-2-1.jpg",
      "/project-2-2.jpg",
      "/project-2-3.jpg",
      "/project-2-4.jpg",
      "/project-2-5.jpg",
    ],
  },
  {
    id: 2,
    slug: "growth-synthesis",
    title: "Growth Synthesis",
    description: "Weaving together insights into a tapestry of understanding.",
    images: [
      "/project-3-1.jpg",
      "/project-3-2.jpg",
      "/project-3-3.jpg",
      "/project-3-4.jpg",
      "/project-3-5.jpg",
    ],
  },
];

interface ScrollDrivenExperienceProps {
  onStageComplete?: (stageId: string) => void;
  onJourneyComplete?: () => void;
}

export default function ScrollDrivenExperience({
  onStageComplete,
  onJourneyComplete
}: ScrollDrivenExperienceProps) {
  // Current stage state
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage = journeyStages[currentStageIndex];
  const nextStage = journeyStages[(currentStageIndex + 1) % journeyStages.length];
  const prevStage = journeyStages[(currentStageIndex - 1 + journeyStages.length) % journeyStages.length];

  // Refs for GSAP animations - exact same as working template
  const projectNavRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const projectDescriptionRef = useRef<HTMLParagraphElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const nextProjectProgressBarRef = useRef<HTMLDivElement>(null);

  // Animation state - exact same as working template
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [shouldUpdateProgress, setShouldUpdateProgress] = useState(true);

  useEffect(() => {
    // Exact same GSAP setup as working template
    gsap.registerPlugin(ScrollTrigger);

    gsap.set(projectNavRef.current, {
      opacity: 0,
      y: -100,
    });

    gsap.to(projectNavRef.current, {
      opacity: 1,
      y: 0,
      duration: 1,
      delay: 0.25,
      ease: "power3.out",
    });

    gsap.to(projectDescriptionRef.current, {
      opacity: 1,
      duration: 1,
      delay: 0.5,
      ease: "power3.out",
    });

    const navScrollTrigger = ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        if (progressBarRef.current) {
          gsap.set(progressBarRef.current, {
            scaleX: self.progress,
          });
        }
      },
    });

    const footerScrollTrigger = ScrollTrigger.create({
      trigger: footerRef.current,
      start: "top top",
      end: `+=${window.innerHeight * 3}px`,
      pin: true,
      pinSpacing: true,
      onEnter: () => {
        if (projectNavRef.current && !isTransitioning) {
          gsap.to(projectNavRef.current, {
            y: -100,
            duration: 0.5,
            ease: "power2.inOut",
          });
        }
      },
      onLeaveBack: () => {
        if (projectNavRef.current && !isTransitioning) {
          gsap.to(projectNavRef.current, {
            y: 0,
            duration: 0.5,
            ease: "power2.inOut",
          });
        }
      },
      onUpdate: (self) => {
        if (nextProjectProgressBarRef.current && shouldUpdateProgress) {
          gsap.set(nextProjectProgressBarRef.current, {
            scaleX: self.progress,
          });
        }

        if (self.progress >= 1 && !isTransitioning) {
          setShouldUpdateProgress(false);
          setIsTransitioning(true);

          const tl = gsap.timeline();

          tl.set(nextProjectProgressBarRef.current, {
            scaleX: 1,
          });

          tl.to(
            [
              footerRef.current?.querySelector(".project-footer-copy"),
              footerRef.current?.querySelector(".next-project-progress"),
            ],
            {
              opacity: 0,
              duration: 0.3,
              ease: "power2.inOut",
            }
          );

          tl.call(() => {
            // Transition to next stage
            const nextIndex = (currentStageIndex + 1) % journeyStages.length;
            setCurrentStageIndex(nextIndex);
            
            // Call the stage complete callback
            onStageComplete?.(currentStage.slug);
            
            // If we've completed all stages, call journey complete
            if (nextIndex === 0) {
              onJourneyComplete?.();
            }
            
            // Reset states for new stage
            setIsTransitioning(false);
            setShouldUpdateProgress(true);
          });
        }
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [currentStageIndex, currentStage.slug, isTransitioning, shouldUpdateProgress, onStageComplete, onJourneyComplete]);

  const handlePrevStage = () => {
    const prevIndex = (currentStageIndex - 1 + journeyStages.length) % journeyStages.length;
    setCurrentStageIndex(prevIndex);
  };

  const handleNextStage = () => {
    const nextIndex = (currentStageIndex + 1) % journeyStages.length;
    setCurrentStageIndex(nextIndex);
  };

  return (
    <ReactLenis root>
      <div className="project-page">
        <div className="project-nav" ref={projectNavRef}>
          <div className="link">
            <span>&#8592;&nbsp;</span>
            <button onClick={handlePrevStage}>Previous</button>
          </div>

          <div className="project-page-scroll-progress">
            <p>{currentStage.title}</p>

            <div
              className="project-page-scroll-progress-bar"
              ref={progressBarRef}
            ></div>
          </div>

          <div className="link">
            <button onClick={handleNextStage}>Next</button>
            <span>&#8594;&nbsp;</span>
          </div>
        </div>

        <div className="project-hero">
          <h1>{currentStage.title}</h1>

          <p id="project-description" ref={projectDescriptionRef}>
            {currentStage.description}
          </p>
        </div>

        <div className="project-images">
          {currentStage.images &&
            currentStage.images.map((image, index) => (
              <div className="project-img" key={index}>
                <img src={image} alt="" />
              </div>
            ))}
        </div>

        <div className="project-footer" ref={footerRef}>
          <h1>{nextStage.title}</h1>

          <div className="project-footer-copy">
            <p>Next Stage</p>
          </div>

          <div className="next-project-progress">
            <div
              className="next-project-progress-bar"
              ref={nextProjectProgressBarRef}
            ></div>
          </div>
        </div>
      </div>
    </ReactLenis>
  );
}