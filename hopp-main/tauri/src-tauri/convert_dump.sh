#!/bin/bash

# Directory containing the YUV files
input_dir=$1
output_dir=$2

# Create output directory if it doesn't exist
mkdir -p "$output_dir"

# Iterate over each .yuv file matching the pattern
for file in "$input_dir"/frame_*x*_*\.yuv; do
    # Extract filename without extension
    filename=$(basename "$file" .yuv)

    # Extract width, height, and frame number from the filename
    if [[ $filename =~ frame_([0-9]+)x([0-9]+)_([0-9]+) ]]; then
        width="${BASH_REMATCH[1]}"
        height="${BASH_REMATCH[2]}"
        frame_number="${BASH_REMATCH[3]}"

        # Define output PNG file name
        output_file="$output_dir/${frame_number}.png"

        echo "Converting $file (Resolution: ${width}x${height}) to $output_file"

        # Use ffmpeg to convert NV12 YUV to PNG
        ffmpeg -f rawvideo -pix_fmt nv12 -s "${width}x${height}" -i "$file" "$output_file"
    else
        echo "Skipping file: $file (Invalid filename format)"
    fi
done

echo "Conversion complete!"

