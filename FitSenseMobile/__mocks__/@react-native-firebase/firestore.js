const firestore = () => ({
  collection: () => ({
    doc: () => ({
      collection: () => ({
        doc: () => ({
          onSnapshot: () => () => {},
        }),
      }),
    }),
  }),
});

module.exports = firestore;
module.exports.default = firestore;
