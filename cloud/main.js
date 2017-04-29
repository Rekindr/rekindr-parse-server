// Class definitions
const Baby = Parse.Object.extend("Baby");
const Photo = Parse.Object.extend("Photo");

Parse.Cloud.define("getBabies", (req, res) => {
    let babyQuery = new Parse.Query(Baby).equalTo('parent', req.user);
    babyQuery.find().then(babies => res.success(babies));
});

Parse.Cloud.define("uploadPhoto", (req, res) => {
    let photo = new Photo();
    photo.set('caption', req.params.caption);
    photo.save().then(result => res.success(result));
})
