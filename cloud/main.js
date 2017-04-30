// Class definitions
const Baby = Parse.Object.extend("Baby");
const Photo = Parse.Object.extend("Photo");
const PhotoBabyTag = Parse.Object.extend("PhotoBabyTag");
const Family = Parse.Object.extend("Family");

Parse.Cloud.define("getBabies", (req, res) => {
    let babyQuery = new Parse.Query(Baby).equalTo('parent', req.user);
    babyQuery.find().then(babies => res.success(babies));
});

Parse.Cloud.define("uploadPhoto", (req, res) => {
    let photo = new Photo();
    photo.set('caption', req.params.caption);
    photo.set('original', req.params.original);
    photo.set('uploader', req.user);
    photo.save().then(savedPhoto => {
        let tags = Object.keys(req.params.babies).map(babyId => {
            let tag = new PhotoBabyTag();
            tag.set('baby', Baby.createWithoutData(babyId));
            tag.set('photo', savedPhoto);
            tag.set('faceBox', req.params.babies[babyId]);
            return tag;
        });
        return Parse.Promise.when(tags.map(tag => tag.save()));
    }).then(() => res.success(photo));
});

Parse.Cloud.define("getNewsFeed", (req, res) => {
    new Parse.Query(Family).equalTo('members', req.user).find().then(families => {
        return Parse.Promise.when(families.map(family => family.get('babies').query().find()));
    }).then(results => {
        let babies = results.reduce((a, v) => a.concat(v), []);
        return new Parse.Query(PhotoBabyTag).containedIn('baby', babies)
            .include('photo')
            .include('baby')
            .limit(30).find();
    }).then(tags => {
        let photos = {};
        tags.forEach(tag => {
            let photoId = tag.get('photo').id;
            if (!photos.hasOwnProperty(photoId)) {
                photos[photoId] = {
                    photo: tag.get('photo'),
                    tags: []
                };
            }
            photos[photoId].tags.push(tag);
        });
        let result = Object.keys(photos).map(photoId => photos[photoId])
            .sort((a, b) => b.photo.get('createdAt') - a.photo.get('createdAt'));
        res.success(result);
    }).fail(err => res.error(err));
});