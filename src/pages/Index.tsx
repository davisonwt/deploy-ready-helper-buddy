import { useEffect } from "react";
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
import seedsStrip from '@/assets/seeds-strip.jpg';


const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm border-b border-green-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[90px]">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center bg-transparent">
                 <img 
                   src="/lovable-uploads/a41a2c64-7483-43dc-90af-67a83994d6aa.png" 
                   alt="sow2grow logo" 
                   className="w-[90px] h-[90px] object-contain bg-transparent"
                   style={{ backgroundColor: 'transparent' }}
                 />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary">sow2grow</h1>
                <p className="text-xs text-green-600">364yhvh community farm</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/login">
                <Button variant="default" className="bg-login hover:bg-login/90 text-login-foreground">login</Button>
              </Link>
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
            webkit-playsinline="true"
            preload="metadata"
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
          
          <h1 className="text-6xl md:text-8xl font-bold text-primary mb-8 animate-fade-in">
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
          <h2 className="text-4xl md:text-5xl font-bold mb-8" style={{ color: '#D69759' }}>How s2g farm mall works</h2>
          <p className="text-xl mb-16 italic" style={{ color: '#BCC4E9' }}>
            roots receive, branches share; one grove, one people, one prayer.
          </p>
          
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100">
                <h3 className="text-2xl font-bold mb-6" style={{ color: '#9DD6AD' }}>sower (farm stall owners)</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#9DD6AD' }}></div>
                    <span style={{ color: '#D3B8A1' }}>get your own farm stall</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#9DD6AD' }}></div>
                    <span style={{ color: '#D3B8A1' }}>create multiple orchards</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#9DD6AD' }}></div>
                    <span style={{ color: '#D3B8A1' }}>sow into your own orchards</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#9DD6AD' }}></div>
                    <span style={{ color: '#D3B8A1' }}>receive community support</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg border border-blue-100">
                <h3 className="text-2xl font-bold mb-6" style={{ color: '#B2C9E2' }}>bestowers (cultivators and harvesters)</h3>
                <div className="space-y-4 text-left">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#B2C9E2' }}></div>
                    <span style={{ color: '#EF9967' }}>browse the farm mall</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#B2C9E2' }}></div>
                    <span style={{ color: '#EF9967' }}>visit different farm stalls</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#B2C9E2' }}></div>
                    <span style={{ color: '#EF9967' }}>bestow support to projects</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: '#B2C9E2' }}></div>
                    <span style={{ color: '#EF9967' }}>build community connections</span>
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
          <div className="text-center relative">
            <h2 className="text-4xl font-bold mb-8" style={{ color: '#D69759' }}>Seeds</h2>
            
            {/* Seeds Strip with 3D Lifted Effect */}
            <div className="relative mb-6 transform-gpu">
              <div className="seeds-strip-container relative z-20 transform 
                            perspective-1000 
                            hover:scale-105 
                            transition-all duration-500 ease-out
                            shadow-2xl 
                            hover:shadow-3xl
                            rotate-x-5
                             translate-y-[-20px]">
                 {/* Text Overlay */}
                 <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="text-center px-8">
                      <p className="text-2xl md:text-3xl font-bold drop-shadow-2xl animate-fade-in leading-tight" style={{ color: '#D5F6FB' }}>
                        products, produce...dreams
                      </p>
                    </div>
                 </div>
                 <video
                  className="w-full h-64 object-cover rounded-lg 
                           shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                           hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                           transition-shadow duration-500 border-0 outline-0"
                  style={{ aspectRatio: '1920/350' }}
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source 
                    src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/seeds%20strip%202aa%20mp4.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
                {/* 3D depth effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
              </div>
              
              {/* Underneath shadow effect */}
              <div className="absolute top-8 left-4 right-4 h-64 bg-black/20 rounded-lg blur-xl z-10"></div>
            </div>
            
            {/* First Video - Emerging from underneath */}
            <div className="relative overflow-hidden mt-[-40px] mb-12 z-10">
              <div className="video-emerging transform translate-y-8 
                            transition-all duration-700 ease-out
                            hover:translate-y-0 hover:scale-105
                            shadow-xl hover:shadow-2xl">
                <video
                  className="w-full h-screen object-cover rounded-lg 
                           shadow-[0_20px_40px_-8px_rgba(0,0,0,0.3)]"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source 
                    src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/seeds 1 mp4.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            
            {/* Second Seeds Strip with 3D Lifted Effect */}
            <div className="relative mb-6 transform-gpu">
              <div className="seeds-strip-container relative z-20 transform 
                            perspective-1000 
                            hover:scale-105 
                            transition-all duration-500 ease-out
                            shadow-2xl 
                            hover:shadow-3xl
                            rotate-x-5
                            translate-y-[-20px]">
                {/* Text Overlay */}
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                  <div className="text-center px-8">
                    <p className="text-2xl md:text-3xl font-bold text-[#6a5acd] drop-shadow-2xl animate-fade-in leading-tight">
                      seeds grow into harvestable 'fruits'
                    </p>
                  </div>
                </div>
                <img 
                  src={seedsStrip}
                  alt="Seeds and sprouting plants"
                  className="w-full h-64 object-cover rounded-lg 
                           shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                           hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                           transition-shadow duration-500"
                  style={{ aspectRatio: '1920/350' }}
                />
                {/* 3D depth effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
              </div>
              
              {/* Underneath shadow effect */}
              <div className="absolute top-8 left-4 right-4 h-64 bg-black/20 rounded-lg blur-xl z-10"></div>
            </div>
            
            {/* Seeds 2 Video - Emerging from underneath the strip above */}
            <div className="relative overflow-hidden mt-[-40px] mb-12 z-10">
              <div className="video-emerging transform translate-y-8
                            transition-all duration-700 ease-out delay-200
                            hover:translate-y-0 hover:scale-105
                            shadow-xl hover:shadow-2xl">
                {/* Text Overlay */}
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="text-center px-8">
                    <p className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl animate-fade-in leading-tight">
                      ...into a home for anyone of our harvesters.{" "}
                      <span className="text-green-300">it is born from purpose, ready to be sown.</span>
                    </p>
                  </div>
                </div>
                
                {/* Flickering Arrow */}
                <div className="absolute top-10 left-1/2 transform -translate-x-1/2 z-30">
                  <div className="flickering-arrow">
                    <svg 
                      className="w-20 h-20 text-yellow-400 drop-shadow-2xl filter drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 22l-8-8h5V2h6v12h5l-8 8z"/>
                    </svg>
                  </div>
                </div>
                
                <video
                  className="w-full h-screen object-cover rounded-lg
                           shadow-[0_20px_40px_-8px_rgba(0,0,0,0.3)]"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source 
                    src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/seeds 2 mp4.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>

          {/* Orchards Section */}
          <div className="text-center relative">
            <h2 className="text-4xl font-bold mb-8" style={{ color: '#A5E3E0' }}>Orchards</h2>
            
            {/* Third Seeds Strip with 3D Lifted Effect */}
            <div className="relative mb-6 transform-gpu">
              <div className="seeds-strip-container relative z-20 transform 
                            perspective-1000 
                            hover:scale-105 
                            transition-all duration-500 ease-out
                            shadow-2xl 
                            hover:shadow-3xl
                            rotate-x-5
                             translate-y-[-20px]">
                 {/* Text Overlay */}
                 <div className="absolute inset-0 z-30 flex items-center justify-center">
                    <div className="text-center px-8">
                      <p className="text-2xl md:text-3xl font-bold drop-shadow-2xl animate-fade-in leading-tight" style={{ color: '#ffc40c' }}>
                        your farm stall
                      </p>
                    </div>
                 </div>
                 <video
                  className="w-full h-64 object-cover rounded-lg 
                           shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                           hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                           transition-shadow duration-500 border-0 outline-0"
                  style={{ aspectRatio: '1920/350' }}
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source 
                    src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/orchards strip1 mp4.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
                {/* 3D depth effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
              </div>
              
              {/* Underneath shadow effect */}
              <div className="absolute top-8 left-4 right-4 h-64 bg-black/20 rounded-lg blur-xl z-10"></div>
            </div>
            
            {/* MP4 Holder Video - With 3D Effects - Now emerges from strip above */}
            <div className="relative mb-2 transform-gpu mt-[-60px]">
              <div className="video-container relative z-20 transform 
                            perspective-1000 
                            hover:scale-105 
                            transition-all duration-500 ease-out
                            shadow-2xl 
                            hover:shadow-3xl
                            rotate-x-2
                            translate-y-[-15px]">
                <video
                  className="w-full h-screen object-cover rounded-lg
                           shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                           hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                           transition-shadow duration-500"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=1920&h=1080&fit=crop"
                >
                  <source 
                    src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/orchards%20main%20mp4.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
                {/* 3D depth effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
              </div>
              
              {/* Underneath shadow effect */}
              <div className="absolute top-8 left-4 right-4 h-screen bg-black/20 rounded-lg blur-xl z-10"></div>
            </div>
            
            {/* Fourth Seeds Strip with 3D Lifted Effect - Community Text Overlay */}
            <div className="relative mb-6 transform-gpu mt-[-80px]">
              <div className="seeds-strip-container relative z-20 transform 
                            perspective-1000 
                            hover:scale-105 
                            transition-all duration-500 ease-out
                            shadow-2xl 
                            hover:shadow-3xl
                            rotate-x-5
                            translate-y-[-20px]">
                {/* Text Overlay */}
                <div className="absolute inset-0 z-30 flex items-center justify-center">
                  <div className="text-center px-8">
                    <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-2xl animate-fade-in leading-tight">
                      our community members act as your online outlets; making tiktok, placing orders, and cultivating your gift into global fruit.
                    </p>
                  </div>
                </div>
                <video
                  className="w-full h-64 object-cover rounded-lg 
                           shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                           hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                           transition-shadow duration-500"
                  style={{ aspectRatio: '1920/350' }}
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source 
                    src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/orchards%20strip2%20mp4.mp4" 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
                {/* 3D depth effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
             </div>
             
             {/* Bestowers Section */}
             <div className="text-center relative mt-12">
               <h2 className="text-4xl font-bold mb-8" style={{ color: '#F6C1B2' }}>Bestowers</h2>
               
               {/* Bestowers Strip with 3D Effects - FIXED URL */}
               <div className="relative mb-6 transform-gpu">
                 <div className="seeds-strip-container relative z-20 transform 
                               perspective-1000 
                               hover:scale-105 
                               transition-all duration-500 ease-out
                               shadow-2xl 
                               hover:shadow-3xl
                               rotate-x-5
                                translate-y-[-20px]">
                     {/* Text Overlay */}
                     <div className="absolute inset-0 z-30 flex items-center justify-center">
                        <div className="text-center px-8">
                          <p className="text-2xl md:text-3xl font-bold drop-shadow-2xl animate-fade-in leading-tight" style={{ color: '#ff1493' }}>
                            ...they make it rain!
                          </p>
                        </div>
                     </div>
                     <video
                      className="w-full h-64 object-cover rounded-lg 
                               shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                               hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                               transition-shadow duration-500"
                      style={{ aspectRatio: '1920/350' }}
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1920&h=350&fit=crop"
                      onError={(e) => console.error('Bestowers strip video error:', e)}
                      onLoadStart={() => console.log('Bestowers strip video loading started')}
                      onCanPlay={() => console.log('Bestowers strip video can play')}
                    >
                      <source 
                        src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/bestowers%20strip%20mp4.mp4" 
                        type="video/mp4" 
                      />
                      Your browser does not support the video tag.
                   </video>
                   {/* 3D depth effect */}
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
                 </div>
                 
                 {/* Underneath shadow effect */}
                 <div className="absolute top-8 left-4 right-4 h-64 bg-black/20 rounded-lg blur-xl z-10"></div>
               </div>
               
               {/* Bestowers Main Video with 3D Effects - ADDED VIDEO URL */}
               <div className="relative mb-12 transform-gpu">
                 <div className="video-container relative z-20 transform 
                               perspective-1000 
                               hover:scale-105 
                               transition-all duration-500 ease-out
                               shadow-2xl 
                               hover:shadow-3xl
                               rotate-x-2
                                translate-y-[-15px]">
                    {/* Text Overlay */}
                    <div className="absolute inset-0 z-30 flex items-center justify-center">
                      <div className="text-center px-8">
                        <p className="text-3xl md:text-4xl font-bold text-white drop-shadow-2xl animate-fade-in leading-tight">
                          those who water and or add compost to your orchard by choosing to grow what you sow.
                        </p>
                      </div>
                    </div>
                    <video
                     className="w-full h-screen object-cover rounded-lg
                              shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                              hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                              transition-shadow duration-500"
                     autoPlay
                     muted
                     loop
                     playsInline
                     poster="https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1920&h=1080&fit=crop"
                      onError={(e) => console.error('Bestowers main video error:', e)}
                      onLoadStart={() => console.log('Bestowers main video loading started')}
                      onCanPlay={() => console.log('Bestowers main video can play')}
                    >
                      <source 
                        src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/bestowers%20main%20mp4.mp4" 
                        type="video/mp4" 
                      />
                     Your browser does not support the video tag.
                   </video>
                   {/* 3D depth effect */}
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
                 </div>
                 
                 {/* Underneath shadow effect */}
                 <div className="absolute top-8 left-4 right-4 h-screen bg-black/20 rounded-lg blur-xl z-10"></div>
               </div>
             </div>
             
              {/* Harvesters Section */}
              <div className="text-center relative mt-12">
                <h2 className="text-4xl font-bold mb-8" style={{ color: '#cfac94' }}>Harvesters</h2>
               
               {/* Harvesters Strip with 3D Effects */}
               <div className="relative mb-6 transform-gpu">
                 <div className="seeds-strip-container relative z-20 transform 
                               perspective-1000 
                               hover:scale-105 
                               transition-all duration-500 ease-out
                               shadow-2xl 
                               hover:shadow-3xl
                               rotate-x-5
                                translate-y-[-20px]">
                     {/* Text Overlay */}
                     <div className="absolute inset-0 z-30 flex items-center justify-center">
                       <div className="text-center px-8">
                         <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-2xl animate-fade-in leading-tight">
                           it could be you!?
                         </p>
                       </div>
                     </div>
                     <video
                      className="w-full h-64 object-cover rounded-lg 
                               shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                               hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                               transition-shadow duration-500"
                      style={{ aspectRatio: '1920/350' }}
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=350&fit=crop"
                      onError={(e) => console.error('Harvesters strip video error:', e)}
                      onLoadStart={() => console.log('Harvesters strip video loading started')}
                      onCanPlay={() => console.log('Harvesters strip video can play')}
                    >
                      <source 
                        src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/harvesters%20strip%20mp4.mp4" 
                        type="video/mp4" 
                      />
                      Your browser does not support the video tag.
                    </video>
                   {/* 3D depth effect */}
                   <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
                 </div>
                 
                 {/* Underneath shadow effect */}
                 <div className="absolute top-8 left-4 right-4 h-64 bg-black/20 rounded-lg blur-xl z-10"></div>
               </div>
               
                {/* Harvesters Video with 3D Effects - Text Overlay */}
                <div className="relative mb-12 transform-gpu">
                  <div className="video-container relative z-20 transform 
                                perspective-1000 
                                hover:scale-105 
                                transition-all duration-500 ease-out
                                shadow-2xl 
                                hover:shadow-3xl
                                rotate-x-2
                                translate-y-[-15px]">
                     {/* Text Overlay */}
                     <div className="absolute inset-0 z-30 flex items-center justify-center">
                       <div className="text-center px-8">
                         <p className="text-3xl md:text-4xl font-bold text-white drop-shadow-2xl animate-fade-in leading-tight">
                           our bestowers, our harvesters.
                         </p>
                       </div>
                     </div>
                     
                     {/* Start Your Journey Button - Bottom Right */}
                     <div className="absolute bottom-8 right-8 z-40">
                       <Link to="/register">
                         <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                           <Heart className="w-5 h-5 mr-2" />
                           start your journey
                         </Button>
                       </Link>
                     </div>
                     <video
                       className="w-full h-screen object-cover rounded-lg
                                shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]
                                hover:shadow-[0_35px_60px_-12px_rgba(0,0,0,0.5)]
                                transition-shadow duration-500"
                       autoPlay
                       muted
                       loop
                       playsInline
                       poster="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&h=1080&fit=crop"
                       onError={(e) => console.error('Harvesters main video error:', e)}
                       onLoadStart={() => console.log('Harvesters main video loading started')}
                       onCanPlay={() => console.log('Harvesters main video can play')}
                     >
                        <source 
                          src="https://zuwkgasbkpjlxzsjzumu.supabase.co/storage/v1/object/public/orchard-videos/harvesters%20main%20mp4.mp4" 
                          type="video/mp4" 
                        />
                       Your browser does not support the video tag.
                     </video>
                    {/* 3D depth effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10 rounded-lg"></div>
                  </div>
                  
                  {/* Underneath shadow effect */}
                  <div className="absolute top-8 left-4 right-4 h-screen bg-black/20 rounded-lg blur-xl z-10"></div>
                </div>
              </div>
              
              {/* Floating Scripture Strip */}
              <div className="relative mt-16 mb-12 transform-gpu">
                <div className="floating-strip relative z-20 transform 
                              perspective-1000 
                              hover:scale-105 
                              transition-all duration-500 ease-out
                              shadow-xl 
                              hover:shadow-2xl
                              translate-y-[-10px]
                              animate-pulse">
                  <div className="bg-green-100 rounded-lg p-8 text-center border border-green-200
                                shadow-[0_15px_30px_-5px_rgba(34,197,94,0.3)]
                                hover:shadow-[0_20px_40px_-5px_rgba(34,197,94,0.4)]
                                transition-shadow duration-500">
                    <p className="text-2xl md:text-3xl font-bold text-green-800 mb-4 leading-tight">
                      "I planted, apollos watered, but elohiym gave the growth."
                    </p>
                    <p className="text-lg text-green-600 font-semibold italic">
                      1 Corinthians 3:6
                    </p>
                  </div>
                  {/* Floating effect shadow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-green-100/20 rounded-lg blur-sm"></div>
                </div>
                
                {/* Underneath floating shadow effect */}
                <div className="absolute top-4 left-4 right-4 h-20 bg-green-300/20 rounded-lg blur-lg z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Index;
