import Layout from '@/components/Layout';
import StudyUploadForm from '@/components/studies/StudyUploadForm';

export default function StudyUploadPage() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <StudyUploadForm />
      </div>
    </Layout>
  );
}
