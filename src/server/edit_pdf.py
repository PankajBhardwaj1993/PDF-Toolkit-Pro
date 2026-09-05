import sys
import json
import base64
import fitz
import math

def hex_to_rgb(hex_str):
    if not hex_str:
        return (0, 0, 0)
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join([c*2 for c in hex_str])
    if len(hex_str) == 6:
        try:
            r = int(hex_str[0:2], 16) / 255.0
            g = int(hex_str[2:4], 16) / 255.0
            b = int(hex_str[4:6], 16) / 255.0
            return (r, g, b)
        except Exception:
            pass
    return (0, 0, 0)

def main():
    try:
        # Read JSON from stdin
        input_data = json.loads(sys.stdin.read())
        
        pdf_base64 = input_data.get("pdfBase64")
        page_num = input_data.get("page", 1)  # 1-based index
        text_to_find = input_data.get("textToFind", "")
        replacement_text = input_data.get("replacementText", "")
        pdf_x = input_data.get("pdfX", 0)
        pdf_y = input_data.get("pdfY", 0)
        font_size = input_data.get("fontSize", 12)
        font_name = input_data.get("fontName", "Helvetica")
        color_hex = input_data.get("color", "#000000")
        pdf_w = input_data.get("pdfW", 50)
        pdf_h = input_data.get("pdfH", 12)

        # Extraction parameters from client
        bold_requested = input_data.get("bold", False)
        italic_requested = input_data.get("italic", False)

        if not pdf_base64:
            print(json.dumps({"success": False, "error": "No PDF data provided"}))
            return

        # Decode PDF
        pdf_bytes = base64.b64decode(pdf_base64)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Select page
        idx = page_num - 1
        if idx < 0 or idx >= len(doc):
            print(json.dumps({"success": False, "error": f"Invalid page index {page_num}"}))
            return
            
        page = doc[idx]
        page_height = page.rect.height
        
        # Convert bottom-left PDF coordinates to top-left PyMuPDF coordinates
        target_x = pdf_x
        target_y = page_height - pdf_y
        
        # Let's locate the closest matching text span from PyMuPDF itself
        best_rect = None
        best_origin = None
        min_dist = float('inf')
        
        # Try finding using page.get_text("dict")
        text_dict = page.get_text("dict")
        for block in text_dict.get("blocks", []):
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    span_text = span.get("text", "").strip()
                    if not span_text:
                        continue
                    
                    s_x0, s_y0, s_x1, s_y1 = span["bbox"]
                    origin_x, origin_y = span.get("origin", (s_x0, s_y1))
                    
                    # Distance from target_x, target_y to span baseline
                    dist = math.hypot(origin_x - target_x, origin_y - target_y)
                    
                    # Weight by text match
                    is_match = (text_to_find.strip() in span_text) or (span_text in text_to_find.strip())
                    if is_match:
                        dist -= 500  # huge weight
                    
                    if dist < min_dist:
                        min_dist = dist
                        best_rect = fitz.Rect(s_x0, s_y0, s_x1, s_y1)
                        best_origin = (origin_x, origin_y)
                        # Read properties of the matched span if not custom overridden
                        if not font_name or font_name == "Helvetica":
                            font_name = span.get("font", font_name)

        # Fallback to standard search_for if best_rect distance is still too high or not found
        if not best_rect or min_dist > 150:
            instances = page.search_for(text_to_find)
            if instances:
                min_dist_search = float('inf')
                for inst in instances:
                    dist = math.hypot(inst.x0 - target_x, inst.y1 - target_y)
                    if dist < min_dist_search:
                        min_dist_search = dist
                        best_rect = inst
                        best_origin = (inst.x0, inst.y1 - 1)
        
        # Map font name to core 14 fonts
        font_lower = font_name.lower()
        is_bold = bold_requested or "bold" in font_lower or "black" in font_lower or "heavy" in font_lower
        is_italic = italic_requested or "italic" in font_lower or "oblique" in font_lower

        if "times" in font_lower or "serif" in font_lower:
            if is_bold and is_italic:
                f_name = "tibi"
            elif is_bold:
                f_name = "tibo"
            elif is_italic:
                f_name = "tiit"
            else:
                f_name = "tiro"
        elif "courier" in font_lower or "mono" in font_lower:
            if is_bold and is_italic:
                f_name = "cobi"
            elif is_bold:
                f_name = "cobo"
            elif is_italic:
                f_name = "coit"
            else:
                f_name = "cour"
        else:
            if is_bold and is_italic:
                f_name = "hebi"
            elif is_bold:
                f_name = "hebo"
            elif is_italic:
                f_name = "heit"
            else:
                f_name = "helv"

        rgb_color = hex_to_rgb(color_hex)
        
        if best_rect and best_origin:
            # Redact matched area
            page.add_redact_annot(best_rect, fill=(1, 1, 1))
            page.apply_redactions()
            
            # Draw the replacement text
            if replacement_text.strip():
                lines = replacement_text.split('\n')
                for i, line in enumerate(lines):
                    # For the first line, align near the bottom (baseline)
                    # For subsequent lines, move down by font_size * 1.2
                    # Adding 1.5 to Y to move it slightly down to match visual alignment
                    pt = fitz.Point(best_origin[0], best_origin[1] + 1.5 + (i * font_size * 1.2))
                    page.insert_text(pt, line, fontsize=font_size, fontname=f_name, color=rgb_color)
        else:
            # Direct coordinates fallback redact
            # target_y is the baseline, so the text bounds go from target_y - pdf_h to target_y
            fallback_rect = fitz.Rect(target_x - 1, target_y - pdf_h - 1, target_x + pdf_w + 1, target_y + 1)
            page.add_redact_annot(fallback_rect, fill=(1, 1, 1))
            page.apply_redactions()
            if replacement_text.strip():
                lines = replacement_text.split('\n')
                for i, line in enumerate(lines):
                    pt = fitz.Point(target_x, target_y + 1.5 + (i * font_size * 1.2))
                    page.insert_text(pt, line, fontsize=font_size, fontname=f_name, color=rgb_color)

        # Save document
        out_bytes = doc.write()
        out_base64 = base64.b64encode(out_bytes).decode('utf-8')
        
        print(json.dumps({"success": True, "pdfBase64": out_base64}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()
