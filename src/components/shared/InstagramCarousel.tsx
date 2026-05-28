"use client";

import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import _Image from "next/image";

export function InstagramCarousel() {
    // Mock Data Simulado (Idealmente vendría de una API o CMS)
    const posts = [
        { id: 1, image: "/images/insta1.jpg", likes: 124, caption: "Entrenando duro 💪 #VirtudGym" },
        { id: 2, image: "/images/insta2.jpg", likes: 89, caption: "Clase de Yoga al amanecer 🌅" },
        { id: 3, image: "/images/insta3.jpg", likes: 256, caption: "Nuevo equipamiento disponible! 🏋️‍♂️" },
        { id: 4, image: "/images/insta4.jpg", likes: 150, caption: "Torneo de Kick Boxing este sábado 🥊" },
    ];

    const stories = [
        { id: 1, name: "Eventos", img: "/images/story1.jpg" },
        { id: 2, name: "Alumnos", img: "/images/story2.jpg" },
        { id: 3, name: "Tips", img: "/images/story3.jpg" },
        { id: 4, name: "Horarios", img: "/images/story4.jpg" },
    ];

    return (
        <section className="py-16 bg-gradient-to-br from-purple-50 to-orange-50" id="comunidad">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Comunidad VIRTUD</h2>
                    <p className="text-gray-600">Síguenos en @virtudgym</p>
                </div>

                {/* Stories Bar */}
                <div className="flex justify-center gap-4 mb-8 overflow-x-auto pb-4">
                    {stories.map((story) => (
                        <div key={story.id} className="flex flex-col items-center gap-1 cursor-pointer">
                            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden relative bg-white">
                                    {/* Placeholder seguro si no hay imagen */}
                                    <div className="w-full h-full bg-gray-200"></div>
                                </div>
                            </div>
                            <span className="text-xs font-medium text-gray-700">{story.name}</span>
                        </div>
                    ))}
                </div>

                {/* Posts Grid (Simulating Carousel for simplicity on mobile, grid on desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {posts.map((post) => (
                        <motion.div
                            key={post.id}
                            whileHover={{ y: -5 }}
                            className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
                        >
                            {/* Header Post */}
                            <div className="flex items-center gap-2 p-3">
                                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">V</div>
                                <span className="text-sm font-semibold text-gray-900">virtudgym</span>
                            </div>

                            {/* Imagen Placeholdereada */}
                            <div className="relative aspect-square w-full bg-gray-100">
                                {/* <Image src={post.image} alt={post.caption} fill className="object-cover" /> */}
                                {/* Usamos div gris para evitar 404s si no existen las imagenes todavía */}
                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                    <span className="text-4xl">📷</span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="p-3">
                                <div className="flex justify-between mb-2">
                                    <div className="flex gap-3">
                                        <Heart className="w-5 h-5 text-gray-700 hover:text-red-500 cursor-pointer" />
                                        <MessageCircle className="w-5 h-5 text-gray-700 cursor-pointer" />
                                        <Send className="w-5 h-5 text-gray-700 cursor-pointer" />
                                    </div>
                                    <Bookmark className="w-5 h-5 text-gray-700 cursor-pointer" />
                                </div>
                                <p className="text-xs font-bold text-gray-900 mb-1">{post.likes} Me gusta</p>
                                <p className="text-xs text-gray-700">
                                    <span className="font-bold mr-1">virtudgym</span>
                                    {post.caption}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
