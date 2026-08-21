import sys
import os

try:
    from rembg import remove
    from PIL import Image
except ImportError as e:
    print(f"Error: Missing dependencies. Please install requirements.txt. Details: {e}", file=sys.stderr)
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 remove_bg.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' not found.", file=sys.stderr)
        sys.exit(1)

    try:
        # Open input image
        input_image = Image.open(input_path)
        
        # Apply rembg (U²-Net is the default model)
        output_image = remove(input_image)
        
        # Save as transparent PNG
        output_image.save(output_path, "PNG")
        print("Success: Background removed.")
    except Exception as e:
        print(f"Error occurred during processing: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
