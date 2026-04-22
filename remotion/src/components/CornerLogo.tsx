import React from "react";
import { Img, staticFile } from "remotion";

/** Persistent S2G corner logo used inside rendered MP4 assets. */
export const CornerLogo: React.FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: 88,
        left: 83,
        zIndex: 40,
      }}
    >
      <Img
        src={staticFile("logo-transparent.png")}
        style={{
          width: 154,
          height: 154,
          objectFit: "cover",
          borderRadius: 999,
          boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
        }}
      />
    </div>
  );
};