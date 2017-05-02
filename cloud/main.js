// Class definitions
const User = Parse.Object.extend("_User");
const Baby = Parse.Object.extend("Baby");
const Photo = Parse.Object.extend("Photo");
const PhotoBabyTag = Parse.Object.extend("PhotoBabyTag");
const Family = Parse.Object.extend("Family");
const Album = Parse.Object.extend("Album");

Parse.Cloud.define("getBabies", (req, res) => {
    let user = req.params.hasOwnProperty('userId') ? User.createWithoutData(req.params.userId) : req.user;
    if (!user) {
        res.error("Unauthorized");
    } else {
        let babyQuery = new Parse.Query(Baby).equalTo('parent', user);
        babyQuery.find().then(babies => res.success(babies));
    }
});

Parse.Cloud.define("getFamilyMembers", (req, res) => {
    new Parse.Query(Family).equalTo('members', req.user).find().then(families => {
        return Parse.Promise.when(families.map(family => family.get('members').query().find()));
    }).then(results => {
        let users = results.reduce((a, v) => a.concat(v), []) // Aggregate results across queries
            .sort((a, b) => a.id.localeCompare(b.id)) // Sort them so that we can find unique members
            .reduce((a, v) => { // Select out adjacent members of different IDs
            if (a.length === 0 || a[a.length - 1].id !== v.id) {
                a.push(v);
            }
            return a;
            }, [])
            // Does not return self
            .filter(user => user.id !== req.user.id)
        res.success(users);
    }).fail(err => res.error(err));
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
            .include('photo.uploader')
            .include('photo.uploader.profile')
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

Parse.Cloud.define('getMemoriesPhotos', (req, res) => {
    let user = req.params.hasOwnProperty('userId') ?
        User.createWithoutData(req.params.userId) :
        req.user;
    if (!user) {
        res.error("Unauthorized");
    } else {
        new Parse.Query(Photo)
            .equalTo('uploader', user)
            .descending('createdAt')
            .find()
            .then(photos => res.success(photos))
            .fail(err => res.error(err));
    }
});

Parse.Cloud.define('createNewAlbum', (req, res) => {
    if (!req.params.hasOwnProperty('name')) {
        res.error("Missing parameters");
    } else {
        let album = new Album();
        album.set('name', req.params.name);
        album.set('createdBy', req.user);
        album.save().then(result => res.success(result));
    }
});

Parse.Cloud.define('getAlbums', (req, res) => {
    let user = req.params.hasOwnProperty('userId') ?
        User.createWithoutData(req.params.userId) :
        req.user;
    if (!user) {
        res.error('Unauthorized');
    } else {
        new Parse.Query(Album).equalTo('createdBy', user).find()
            .then(albums => res.success(albums))
            .fail(err => res.error(err));
    }
});

Parse.Cloud.define('addPhotosToAlbum', (req, res) => {
    if (!req.params.hasOwnProperty('photoIds') ||
        !req.params.hasOwnProperty('albumId')) {

        res.error("Missing parameters");
    } else {
        new Parse.Query(Album).get(req.params.albumId).then(album => {
            album.relation('photos').add(
                req.params.photoIds.map(photoId => Photo.createWithoutData(photoId))
            );
            return album.save();
        }).then(album => {
            res.success(album);
        }).fail(err => res.error(err));
    }
});

Parse.Cloud.define('removePhotosFromAlbum', (req, res) => {
    if (!req.params.hasOwnProperty('photoIds') ||
        !req.params.hasOwnProperty('albumId')) {

        res.error("Missing parameters");
    } else {
        new Parse.Query(Album).get(req.params.albumId).then(album => {
            album.relation('photos').remove(
                req.params.photoIds.map(photoId => Photo.createWithoutData(photoId))
            );
            return album.save();
        }).then(album => {
            res.success(album);
        }).fail(err => res.error(err));
    }
});

Parse.Cloud.define('renameAlbum', (req, res) => {
    if (!req.params.hasOwnProperty('albumId') ||
        !req.params.hasOwnProperty('name')) {

        res.error("Missing parameters");
    } else {
        new Parse.Query(Album).get(req.params.albumId).then(album => {
            album.set('name', req.params.name);
            return album.save();
        }).then(album => res.success(album))
            .fail(err => res.error(err));
    }
});

Parse.Cloud.define('favoritePhoto', (req, res) => {
    if (!req.params.hasOwnProperty('photoId'))  {

        res.error("Missing parameters");
    } else {
        new Parse.Query(Photo).get(req.params.photoId).then(photo => {
            photo.set('favorite', true);
            return photo.save();
        }).then(album => res.success(album))
            .fail(err => res.error(err));
    }
});

Parse.Cloud.define('createAlbumWithPhotos', (req, res) => {
    if (!req.params.hasOwnProperty('name') ||
        !req.params.hasOwnProperty('photoIds')) {

        res.error("Missing parameters");
    } else {
        let album = new Album();
        album.set('name', req.params.name);
        album.set('createdBy', req.user);
        album.relation('photos').add(
            req.params.photoIds.map(photoId => Photo.createWithoutData(photoId))
        );
        album.save().then(result => res.success(result));
    }
});
