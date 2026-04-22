import React from "react";
import { Img, staticFile } from "remotion";

/** Persistent S2G corner logo used inside rendered MP4 assets. */
export const CornerLogo: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        left: 84,
        zIndex: 40,
      }}
    >
      <Img
        src={staticFile("logo.jpeg")}
        style={{
          width: 140,
          height: "auto",
          objectFit: "contain",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
};