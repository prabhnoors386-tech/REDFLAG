import React from "react";
import {
  ShaderGradientCanvas,
  ShaderGradient,
} from "@shadergradient/react";

export default function ShaderBackground() {
  return (
    <ShaderGradientCanvas
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
      }}
      pixelDensity={1}
      fov={40}
    >
      <ShaderGradient
        animate="on"
        axesHelper="off"
        brightness={1.1}
        cAzimuthAngle={180}
        cDistance={6.4}
        cPolarAngle={90}
        cameraZoom={3.2}
color1="#bec1ed"
color2="#6bb2ce"
color3="#355fae"
        destination="onCanvas"
        embedMode="off"
        envPreset="city"
        grain="on"
        lightType="3d"
        positionX={-1.4}
        positionY={0}
        positionZ={0}
        reflection={0.1}
        rotationX={0}
        rotationY={10}
        rotationZ={50}
        shader="defaults"
        type="waterPlane"
        uAmplitude={2}
        uDensity={0.5}
        uFrequency={5.5}
        uSpeed={0.15}
        uStrength={1.5}
        wireframe={false}
      />
    </ShaderGradientCanvas>
  );
}
