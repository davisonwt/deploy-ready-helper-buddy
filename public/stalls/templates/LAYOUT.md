# Template #1 interior layout

If you're painting your own interior image to use as `farm-stall-1`'s art (or replacing `farm-stall-interior.png` itself), the four bottom tiles and the coffee mug need to sit at the positions below, because the app taps invisible buttons onto your image at these exact percentages of its own width/height (not the screen's) -- reuse this same 1216x848-proportioned layout (or any image with these four tiles across the bottom and a small mug-sized object at the left side table) and the buttons will line up; stray from it and visitors will tap blank space.

| Button | x (left) | y (top) | w (width) | h (height) | Where it goes |
|---|---|---|---|---|---|
| Books | 5.9% | 67.0% | 20.6% | 20.0% | 1st of the 4 bottom tiles |
| Music | 28.4% | 67.0% | 20.6% | 20.0% | 2nd of the 4 bottom tiles |
| Lyrics | 50.8% | 67.0% | 20.6% | 20.0% | 3rd of the 4 bottom tiles |
| My Story | 73.4% | 67.0% | 20.8% | 20.0% | 4th of the 4 bottom tiles |
| Mugs | 7.8% | 50.3% | 7.6% | 10.0% | The mug on the left side table |

All values are percentages of the image's own natural width (x, w) or height (y, h) -- e.g. Books' `x: 5.9%` means its left edge sits 5.9% of the way across the image, measured on the image itself, whatever size you export it at.
