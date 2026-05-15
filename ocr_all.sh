#!/bin/bash
for part in $(seq 1 10); do
    img_dir="/home/z/my-project/upload/ocr_images/part${part}"
    out_file="/home/z/my-project/upload/part${part}_text.txt"
    > "$out_file"  # clear output file
    
    pages=$(ls "$img_dir"/page_*.png 2>/dev/null | sort)
    count=0
    for page_path in $pages; do
        tesseract "$page_path" stdout --psm 3 2>/dev/null >> "$out_file"
        echo "" >> "$out_file"
        count=$((count + 1))
    done
    echo "Part ${part}: ${count} pages OCR'd"
done
echo "ALL OCR COMPLETE"
