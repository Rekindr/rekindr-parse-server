// Class definitions
const Baby = Parse.Object.extend("Baby");
const Photo = Parse.Object.extend("Photo");
const PhotoBabyTag = Parse.Object.extend("PhotoBabyTag");

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
            tag.set('faceLeft', babies[babyId][0]);
            tag.set('faceTop', babies[babyId][1]);
            tag.set('faceRight', babies[babyId][2]);
            tag.set('faceBottom', babies[babyId][3]);
            return tag;
        });
        return Parse.Promise.when(tags.map(tag => tag.save()));
    }).then(() => res.success(photo));
})
