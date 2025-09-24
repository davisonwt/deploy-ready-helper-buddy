import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoComments from '@/components/video/VideoComments';

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Video Not Found</h1>
            <p className="text-muted-foreground mt-2">The requested video could not be found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <VideoPlayer videoId={id} />
          <VideoComments videoId={id} />
        </div>
      </div>
    </Layout>
  );
}