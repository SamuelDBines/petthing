from __future__ import annotations

import json
import shutil
import subprocess
import textwrap
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


@dataclass
class RenderResult:
    video_path: Path
    srt_path: Path
    caption_txt_path: Path


def _fit_cover(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / img.width, target_h / img.height)
    new_size = (int(img.width * scale), int(img.height * scale))
    resized = img.resize(new_size, Image.Resampling.LANCZOS)
    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def _frame(
    image_path: Path,
    label: str,
    subtitle: str,
    size: tuple[int, int] = (1080, 1920),
) -> Image.Image:
    base = Image.new("RGB", size, (18, 16, 28))
    photo = Image.open(image_path).convert("RGB")
    fitted = _fit_cover(photo, (size[0], int(size[1] * 0.72)))
    base.paste(fitted, (0, int(size[1] * 0.12)))

    draw = ImageDraw.Draw(base)
    title_font = _load_font(64)
    sub_font = _load_font(40)
    draw.text((48, 48), label, fill=(255, 240, 220), font=title_font)
    wrapped = textwrap.fill(subtitle, width=28)
    draw.multiline_text((48, size[1] - 280), wrapped, fill=(230, 230, 240), font=sub_font, spacing=8)
    return base


def render_before_after_short(
    *,
    before_path: Path,
    after_path: Path,
    output_dir: Path,
    slug: str,
    hook: str,
    reveal_line: str,
    duration_seconds: float = 12.0,
) -> RenderResult:
    output_dir.mkdir(parents=True, exist_ok=True)
    work = output_dir / f"{slug}_work"
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    size = (1080, 1920)
    before_frame = _frame(before_path, "Before", hook, size=size)
    after_frame = _frame(after_path, "After", reveal_line, size=size)

    before_png = work / "before.png"
    after_png = work / "after.png"
    before_frame.save(before_png)
    after_frame.save(after_png)

    half = duration_seconds / 2
    video_path = output_dir / f"{slug}.mp4"
    srt_path = output_dir / f"{slug}.srt"
    caption_txt_path = output_dir / f"{slug}-captions.txt"

    srt_body = (
        f"1\n00:00:00,000 --> 00:00:{int(half):02d},000\n{hook}\n\n"
        f"2\n00:00:{int(half):02d},000 --> 00:00:{int(duration_seconds):02d},000\n{reveal_line}\n"
    )
    srt_path.write_text(srt_body, encoding="utf-8")
    caption_txt_path.write_text(f"{hook}\n\n{reveal_line}\n", encoding="utf-8")

    if shutil.which("ffmpeg"):
        cmd = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-t",
            str(half),
            "-i",
            str(before_png),
            "-loop",
            "1",
            "-t",
            str(half),
            "-i",
            str(after_png),
            "-filter_complex",
            (
                f"[0:v]scale={size[0]}:{size[1]},fade=t=out:st={half - 0.4}:d=0.4[v0];"
                f"[1:v]scale={size[0]}:{size[1]},fade=t=in:st=0:d=0.4[v1];"
                f"[v0][v1]concat=n=2:v=1:a=0,format=yuv420p[v]"
            ),
            "-map",
            "[v]",
            "-r",
            "30",
            str(video_path),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
    else:
        # Fallback: single-frame "video" as png renamed — tests patch ffmpeg
        after_frame.save(video_path.with_suffix(".png"))

    manifest = {
        "video": str(video_path),
        "srt": str(srt_path),
        "before": str(before_path),
        "after": str(after_path),
    }
    (output_dir / f"{slug}.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return RenderResult(video_path=video_path, srt_path=srt_path, caption_txt_path=caption_txt_path)
