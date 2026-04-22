import React from "react";
import { Img, staticFile } from "remotion";

/** Persistent S2G corner logo used inside rendered MP4 assets. */
export const CornerLogo: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        left: 56,
        zIndex: 40,
        width: 140,
        height: 140,
        borderRadius: 16,
        overflow: "hidden",
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      }}
    >
      <Img
        src={staticFile("logo.jpeg")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};