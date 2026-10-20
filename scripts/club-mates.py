"""
Builds the sprite sheets for the club easter egg: Casa (the official mascot) and the eleven "alternative mascot
designs" from page 12 of the Club Casa Brand Guideline (Alicyte Design), as Casa's mates.

    python3 scripts/club-mates.py ~/Desktop/club-casa-branding/guideline-pages/page-12.png

Both sheets are 4 x 4 cells of 256 px (12 used), each character scaled to fit 232 px, centred, with its feet on the
cell's floor (y = 244). Cell 0 is Casa, from the full-size official PNG.

    public/club/mates.png     white, with the artwork as alpha: for CSS masks.
    public/club/mates-gl.png  for WebGL, without alpha (browsers may premultiply it away): red is the artwork grown
                              by an outline, green a soft, blurred copy (for the light the gobos throw), blue the
                              artwork itself.

Needs Pillow and numpy.
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CELL, FIT, FLOOR, GRID = 256, 232, 244, 4

# Where each character sits on the guideline page (column, row of its 4 x 3 grid), in sheet order. The page's own
# Casa (column 3, row 2) is skipped: cell 0 uses the official mascot file instead.
PAGE_ORDER = [(1, 1), (2, 1), (3, 1), (4, 1), (1, 2), (2, 2), (4, 2), (1, 3), (2, 3), (3, 3), (4, 3)]
COLUMNS = [(250, 470), (480, 705), (715, 925), (935, 1160)]
ROWS = [(200, 412), (412, 594), (594, 790)]


def coverage(image: Image.Image) -> np.ndarray:
    """How much of each pixel is ink (0-1): the charcoal artwork against the cream page, or the PNG's own alpha."""
    rgba = np.asarray(image.convert('RGBA'), dtype=np.float32) / 255
    luminance = rgba[..., :3] @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    paper, ink = np.median(luminance), 0.13
    ink_amount = np.clip((paper - luminance) / (paper - ink), 0, 1)
    return np.minimum(ink_amount, rgba[..., 3])


def components(mask: np.ndarray):
    """Connected shapes in a boolean mask (4-neighbour), as lists of (y, x) pixels."""
    seen = np.zeros_like(mask, dtype=bool)
    height, width = mask.shape
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]:
            continue
        pixels, queue = [], deque([(y0, x0)])
        seen[y0, x0] = True
        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < height and 0 <= nx < width and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        yield pixels


def cut_page(page: np.ndarray):
    """The eleven characters on the page, each as a coverage crop with nothing from its neighbours."""
    owner = np.full(page.shape, -1, dtype=np.int32)
    grown = page > 0.02
    for pixels in components(grown):
        ys, xs = zip(*pixels)
        cy, cx = np.mean(ys), np.mean(xs)
        column = next((i for i, (a, b) in enumerate(COLUMNS) if a <= cx < b), None)
        row = next((i for i, (a, b) in enumerate(ROWS) if a <= cy < b), None)
        if column is None or row is None:
            continue  # the page title, or stray marks
        owner[ys, xs] = row * 4 + column
    crops = []
    for column, row in PAGE_ORDER:
        index = (row - 1) * 4 + (column - 1)
        mine = np.where(owner == index, page, 0)
        ys, xs = np.nonzero(mine > 0.02)
        crops.append(mine[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1])
    return crops


def trim(art: np.ndarray):
    ys, xs = np.nonzero(art > 0.02)
    return art[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def place(sheet: np.ndarray, art: np.ndarray, cell: int):
    """Scales a character to fit the cell and stands it on the cell's floor, centred."""
    height, width = art.shape
    scale = FIT / max(height, width)
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    image = Image.fromarray((art * 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    x0 = (cell % GRID) * CELL + (CELL - size[0]) // 2
    y0 = (cell // GRID) * CELL + FLOOR - size[1]
    sheet[y0 : y0 + size[1], x0 : x0 + size[0]] = np.asarray(image, dtype=np.float32) / 255
    return size


def blur(art: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray((art * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(image, dtype=np.float32) / 255


def outline_and_glow(sheet: np.ndarray):
    """Per cell (so nothing spills into a neighbour): the artwork grown by about 8 px, and a soft blurred copy."""
    grown, soft = np.zeros_like(sheet), np.zeros_like(sheet)
    for cell in range(GRID * GRID):
        ys = slice((cell // GRID) * CELL, (cell // GRID + 1) * CELL)
        xs = slice((cell % GRID) * CELL, (cell % GRID + 1) * CELL)
        art = sheet[ys, xs]
        if not art.any():
            continue
        reach = np.clip((blur(art, 5) - 0.03) / 0.05, 0, 1)
        grown[ys, xs] = np.maximum(reach * reach * (3 - 2 * reach), art)
        soft[ys, xs] = blur(art, 7)
    return grown, soft


def save(path: Path, channels):
    path.parent.mkdir(parents=True, exist_ok=True)
    pixels = np.stack([(np.clip(channel, 0, 1) * 255).astype(np.uint8) for channel in channels], axis=-1)
    Image.fromarray(pixels).save(path, optimize=True)
    print(f'wrote {path.relative_to(ROOT)} ({path.stat().st_size // 1024} KB)')


def main():
    page_path = Path(sys.argv[1] if len(sys.argv) > 1 else '~/Desktop/club-casa-branding/guideline-pages/page-12.png')
    page = coverage(Image.open(page_path.expanduser()))
    casa = trim(coverage(Image.open(ROOT / 'public/brand/official/mascot.png')))
    sheet = np.zeros((CELL * GRID, CELL * GRID), dtype=np.float32)
    for cell, art in enumerate([casa, *cut_page(page)]):
        width, height = place(sheet, art, cell)
        print(f'cell {cell:2d}: {width} x {height}')
    save(ROOT / 'public/club/mates.png', [np.ones_like(sheet), sheet])
    save(ROOT / 'public/club/mates-gl.png', [*outline_and_glow(sheet), sheet])


if __name__ == '__main__':
    main()
