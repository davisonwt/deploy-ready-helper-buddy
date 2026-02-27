import Layout from '@/components/Layout';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { Cloud } from 'lucide-react';

const WeatherPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Cloud className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Weather</h1>
          </div>
          <p className="text-muted-foreground">
            Set your timezone to see your local weather conditions.
          </p>
        </div>
        <WeatherWidget />
      </div>
    </Layout>
  );
};

export default WeatherPage;
