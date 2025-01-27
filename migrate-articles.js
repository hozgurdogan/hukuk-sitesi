require('dotenv').config();
const mongoose = require('mongoose');
const Article = require('./models/Article');
const User = require('./models/User');

const MONGODB_LOCAL = 'mongodb://127.0.0.1:27017/hukukburosu';
const MONGODB_ATLAS = process.env.MONGODB_URI;

async function migrateArticles() {
    try {
        // Yerel veritabanına bağlan
        const localDb = await mongoose.createConnection(MONGODB_LOCAL);
        console.log('Yerel veritabanına bağlandı');

        // Atlas'a bağlan
        const atlasDb = await mongoose.createConnection(MONGODB_ATLAS);
        console.log('Atlas veritabanına bağlandı');

        // User modellerini oluştur
        const LocalUser = localDb.model('User', User.schema);
        const AtlasUser = atlasDb.model('User', User.schema);

        // Yerel makaleleri al
        const LocalArticle = localDb.model('Article', Article.schema);
        const localArticles = await LocalArticle.find().populate('author');
        console.log(`${localArticles.length} makale bulundu`);

        // Her makaleyi Atlas'a aktar
        for (const article of localArticles) {
            try {
                // Önce yazarı kontrol et ve aktar
                if (article.author) {
                    const localUser = await LocalUser.findById(article.author._id);
                    if (localUser) {
                        let atlasUser = await AtlasUser.findOne({ username: localUser.username });
                        if (!atlasUser) {
                            atlasUser = new AtlasUser({
                                username: localUser.username,
                                password: localUser.password,
                                isAdmin: localUser.isAdmin
                            });
                            await atlasUser.save();
                            console.log(`"${localUser.username}" kullanıcısı aktarıldı`);
                        }
                        article.author = atlasUser._id;
                    }
                }

                // Makaleyi kontrol et ve aktar
                const AtlasArticle = atlasDb.model('Article', Article.schema);
                const existingArticle = await AtlasArticle.findOne({ title: article.title });
                if (!existingArticle) {
                    const newArticle = new AtlasArticle({
                        title: article.title,
                        content: article.content,
                        category: article.category,
                        author: article.author,
                        views: article.views,
                        createdAt: article.createdAt,
                        updatedAt: article.updatedAt
                    });
                    await newArticle.save();
                    console.log(`"${article.title}" başlıklı makale aktarıldı`);
                } else {
                    console.log(`"${article.title}" başlıklı makale zaten mevcut`);
                }
            } catch (error) {
                console.error(`Makale aktarım hatası (${article.title}):`, error);
            }
        }

        console.log('Migrasyon tamamlandı');
        process.exit(0);
    } catch (error) {
        console.error('Migrasyon hatası:', error);
        process.exit(1);
    }
}

// Migrasyon işlemini başlat
migrateArticles(); 