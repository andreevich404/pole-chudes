import { CanvasTexture, SRGBColorSpace } from "three";
import { SECTORS } from "../game/wheelSectors";

/** Рисует лицо барабана: сектор i занимает дугу от i·S по часовой стрелке от верха */
export function createWheelTexture(
  size = 1024,
  maxAnisotropy = 1,
): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas недоступен");

  const c = size / 2;
  const R = c - 2;
  const step = (Math.PI * 2) / SECTORS.length;
  const top = -Math.PI / 2;

  SECTORS.forEach((s, i) => {
    const a0 = top + i * step;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.arc(c, c, R, a0, a0 + step);
    ctx.closePath();
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.lineWidth = size * 0.002;
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.stroke();
  });

  // объём: лёгкое затемнение к краю и свечение у центра
  const g = ctx.createRadialGradient(c, c, R * 0.15, c, c, R);
  g.addColorStop(0, "rgba(255,255,255,0.04)");
  g.addColorStop(0.6, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.22)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fill();

  SECTORS.forEach((s, i) => {
    const channels = s.color.match(/[a-f0-9]{2}/gi)!.map((hex) => {
      const value = parseInt(hex, 16) / 255;
      return value <= 0.04045
        ? value / 12.92
        : Math.pow((value + 0.055) / 1.055, 2.4);
    });
    const luminance =
      channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
    const textColor = luminance > 0.179 ? "#101b2b" : "#ffffff";
    const mid = top + (i + 0.5) * step;
    const fontSize =
      size *
      (s.label.length >= 5
        ? 0.058
        : s.label.length === 4
          ? 0.075
          : s.label.length === 3
            ? 0.088
            : 0.096);
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(mid);
    ctx.font = `${fontSize}px 'Russo One', 'Rubik', sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.0035;
    ctx.strokeStyle =
      textColor === "#ffffff" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)";
    ctx.strokeText(s.label, R - size * 0.035, 0);
    ctx.fillStyle = textColor;
    ctx.fillText(s.label, R - size * 0.035, 0);
    ctx.restore();
  });

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}
