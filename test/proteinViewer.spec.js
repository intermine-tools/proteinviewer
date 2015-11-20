define(['./tool'], function(tool) {

  describe('neeps', function() {
    it('tatties', function() {
      // just checking that _ works
      expect([1, 2, 3].length).toEqual(3);
    });
  });

  describe('neeps', function() {
    it('tatties', function() {
      tool.init();
      // just checking that _ works
      expect([1, 2, 3].length).toEqual(3);
    });
  });

});
