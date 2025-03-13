ffmpeg -i "rtsp://<USERNAME>:<PASS>@<ip-address>:554/stream1" ^
  -c:v copy -c:a copy ^
  -f hls ^
  -hls_time 4 ^
  -hls_list_size 6 ^
  -hls_flags delete_segments ^
  C:.\hls_output\hls\stream.m3u8 <PATH>