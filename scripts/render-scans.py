"""将同分页清理副本渲染为网站按需加载的扫描页。需要 PyMuPDF 与 Pillow。"""

import argparse
from pathlib import Path

import pymupdf
from PIL import Image


def render(source: Path, output: Path, expected_pages: int):
    with pymupdf.open(source) as document:
        if len(document) != expected_pages:
            raise ValueError(f"{source.name} 需要 {expected_pages} 页，实际 {len(document)} 页")
        output.mkdir(parents=True, exist_ok=True)
        for index, page in enumerate(document, start=1):
            pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2200 / page.rect.width, 2200 / page.rect.width), alpha=False)
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
            image.save(output / f"{index:03}.webp", quality=85, method=4)
            if index % 25 == 0 or index == len(document):
                print(f"{output.name}: {index}/{len(document)}", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", type=Path, help="215 页中外教育史同页清理副本 PDF")
    parser.add_argument("--edu", type=Path, help="157 页教心、教原同页清理副本 PDF")
    args = parser.parse_args()
    output = Path(__file__).resolve().parents[1] / "public" / "scans"
    if not args.history and not args.edu:
        parser.error("请提供至少一册清理副本 PDF")
    if args.history:
        render(args.history, output / "history-clean", 215)
    if args.edu:
        render(args.edu, output / "edu", 157)


if __name__ == "__main__":
    main()
