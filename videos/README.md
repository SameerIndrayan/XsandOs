# Test videos - add your video files here for testing

You can upload videos from this folder using:

  curl -X POST http://localhost:3000/api/annotate -F 'video=@./videos/your-video.mp4'

Or use the test script:

  ./upload-test.sh ./videos/your-video.mp4
