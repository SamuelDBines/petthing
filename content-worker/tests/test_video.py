from __future__ import annotations

from pathlib import Path

from app.video.render import render_before_after_short


def test_render_before_after_short(tmp_path: Path) -> None:
    repo = Path(__file__).resolve().parents[2]
    before = repo / "public/examples/pet-before.jpg"
    after = repo / "public/examples/pet-after.jpg"
    assert before.exists() and after.exists()

    result = render_before_after_short(
        before_path=before,
        after_path=after,
        output_dir=tmp_path,
        slug="test",
        hook="Before the portrait",
        reveal_line="After the magic",
        duration_seconds=4.0,
    )
    assert result.srt_path.exists()
    assert result.caption_txt_path.exists()
    assert "Before the portrait" in result.caption_txt_path.read_text()
    assert result.video_path.exists() or result.video_path.with_suffix(".png").exists()
