import sys
from PIL import Image
from escpos.printer import Network

# Define your printer's maximum printable pixel width
# Common values: 58mm paper = 384px | 80mm paper = 512px or 576px
PRINTER_WIDTH = 576

def process_image(image_path, target_width):
    """
    Open and resize the image maintaining the aspect ratio
    """
    img = Image.open(image_path)

    # Calculate height based on target width to maintain aspect ratio
    width_percent = (target_width / float(img.size[0]))
    target_height = int((float(img.size[1]) * float(width_percent)))

    # Resize the image using high-quality resampling
    resized_img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    return resized_img


def main():
    p = Network('192.168.1.83')
    processed_img = process_image(sys.argv[1], PRINTER_WIDTH)
    p.image(processed_img)
    p.cut()


if __name__ == '__main__':
    main()
