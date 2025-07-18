import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  Sprout, 
  Heart, 
  Users, 
  Gift,
   TreePine
} from "lucide-react";


const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center bg-transparent">
                 <img 
                   src="/lovable-uploads/ff9e6e48-049d-465a-8d2b-f6e8fed93522.png" 
                   alt="sow2grow logo" 
                   className="w-[90px] h-[90px] object-contain bg-transparent"
                   style={{ backgroundColor: 'transparent' }}
                 />
              </div>
              <div>
                <h1 className="text-xl font-bold text-green-800">sow2grow</h1>
                <p className="text-xs text-green-600">364yhvh community farm</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Button variant="ghost" className="text-green-700">join community</Button>
              <Button variant="outline" className="border-green-200 text-green-700">community orchards</Button>
              <Button variant="default" className="bg-green-600 hover:bg-green-700">login</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Video Background */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 w-full h-full bg-black">
          <video 
            key={Math.random().toString(36)}
            autoPlay 
            loop 
            muted 
            playsInline
            controls={false}
            className="w-full h-full object-cover"
            src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/hero-background-new.mp4.mp4"
            onError={(e) => {
              console.log('Video error:', e);
              e.currentTarget.style.display = 'none';
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
        {/* Video Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/50 to-green-900/50 z-10"></div>
        
        <div className="relative z-20 text-center max-w-6xl mx-auto px-4">
          <div className="mb-8">
            <div className="inline-flex items-center bg-amber-500/90 text-white px-6 py-2 rounded-full mb-8">
              <Sprout className="w-5 h-5 mr-2" />
              364yhvh community farm stall
            </div>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold text-blue-400 mb-8 animate-fade-in">
            welcome to sow2grow
          </h1>
          
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-4xl mx-auto leading-relaxed">
            the farm stall of the 364yhvh community; a haven of hands and harvest, where sacred seasons meet the fruits of faithful labor.
          </p>
          
          <p className="text-lg md:text-xl text-white/80 mb-12 max-w-3xl mx-auto italic">
            a fertile ground where <span className="text-green-300">every grower finds their orchard</span>, 
            <span className="text-blue-300"> every seed becomes a fruit-bearing tree</span>, 
            and <span className="text-amber-300">every harvest meets the hands destined to gather it</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 text-lg rounded-full">
                <Heart className="w-5 h-5 mr-2" />
                start your journey
              </Button>
            </Link>
            <Link to="/browse-orchards">
              <Button size="lg" variant="outline" className="border-white/30 text-blue-500 hover:bg-white/10 hover:text-blue-500 px-8 py-4 text-lg rounded-full backdrop-blur-sm">
                <TreePine className="w-5 h-5 mr-2" />
                community orchards
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Three Features Cards */}
      <section className="py-20 bg-gradient-to-b from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-12">
            <Card className="text-center bg-gradient-to-br from-pink-100 to-pink-50 border-pink-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-pink-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-brown-800 mb-4">scriptural giving</h3>
                <p className="text-brown-700 leading-relaxed italic">
                  give with joy, not just duty,<br />
                  first fruits and love, your tithe of beauty.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-100 to-green-50 border-green-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-brown-800 mb-4">community support</h3>
                <p className="text-brown-700 leading-relaxed italic">
                  growers sow, bestowers flow;<br />
                  shared harvest makes the body grow.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-brown-800 mb-4">s2g farm mall</h3>
                <p className="text-brown-700 leading-relaxed italic">
                  each stall blooms, each hand gives;<br />
                  fruit shared fresh, the body lives.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-gradient-to-b from-white to-green-50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-green-800 mb-8">How s2g farm mall works</h2>
          <p className="text-xl text-green-700 mb-16 italic">
            roots receive, branches share; one grove, one people, one prayer.
          </p>
          
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100">
                <h3 className="text-2xl font-bold text-green-800 mb-6">sower (farm stall owners)</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-green-700">get your own farm stall</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-green-700">create multiple orchards</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-green-700">sow into your own orchards</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-green-700">receive community support</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100">
                <h3 className="text-2xl font-bold text-blue-800 mb-6">bestowers (cultivators and harvesters)</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-blue-700">browse the farm mall</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-blue-700">Visit different farm stalls</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-blue-700">bestow support to projects</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <span className="text-blue-700">build community connections</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Video Sections */}
      <section className="py-20 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-6xl mx-auto px-4 space-y-20">
          {/* Seeds Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-green-800 mb-8">Seeds</h2>
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center mb-6">
              <span className="text-gray-600">seeds video strip</span>
            </div>
            <p className="text-lg text-green-700 max-w-3xl mx-auto">
              ...into a home for anyone of our harvesters. it is born from purpose, ready to be sown.
            </p>
          </div>

          {/* Orchards Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-green-800 mb-8">Orchards</h2>
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center mb-6">
              <span className="text-gray-600">orchards video strip</span>
            </div>
            <p className="text-lg text-green-700 max-w-3xl mx-auto">
              our community members act as your online outlets; making tiktok, placing orders, and cultivating your gift into global fruit.
            </p>
          </div>

          {/* Bestowers Section */}
          <div className="text-center">
            <h2 className="text-4xl font-bold text-green-800 mb-8">Bestowers</h2>
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center mb-6">
              <span className="text-gray-600">bestowers video strip</span>
            </div>
            <p className="text-lg text-green-700 max-w-3xl mx-auto">
              those who water and or add compost to your orchard by choosing to grow what you sow.
            </p>
          </div>
        </div>
      </section>

      {/* Tithing & Free-will Gifting */}
      <section className="py-20 bg-gradient-to-b from-white to-green-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Tithing */}
            <div className="text-center">
              <h3 className="text-3xl font-bold text-green-800 mb-8">tithing</h3>
              <div className="space-y-4 mb-8">
                <p className="text-green-700">Biblical tithing</p>
                <p className="text-green-700">Community support</p>
                <p className="text-green-700">Faith-based giving</p>
                <p className="text-green-700">Sacred stewardship</p>
              </div>
              <Link to="/tithing">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full">
                  <span className="block">let it rain over the 'gosat'</span>
                  <span className="block text-sm">(gosat - guardians of the set-apart tabernacle)</span>
                </Button>
              </Link>
            </div>

            {/* Free-will Gifting */}
            <div className="text-center">
              <h3 className="text-3xl font-bold text-green-800 mb-8">free-will gifting</h3>
              <div className="space-y-4 mb-8">
                <p className="text-green-700">Voluntary giving</p>
                <p className="text-green-700">Heart-led donations</p>
                <p className="text-green-700">Community blessing</p>
                <p className="text-green-700">Generous spirit</p>
              </div>
               <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full">
                 let it rain over the community
               </Button>
             </div>
           </div>
         </div>
       </section>
    </div>
  );
};

export default Index;
