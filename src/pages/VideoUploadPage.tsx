import Layout from '@/components/Layout';
import VideoUpload from '@/components/video/VideoUpload';

export default function VideoUploadPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Upload Video</h1>
            <p className="text-muted-foreground mt-2">
              Share your videos with the community
            </p>
          </div>
          <VideoUpload />
        </div>
      </div>
    </Layout>
  );
}