$(function() {
  
  /*Open chat sidebar*/
  $('.chat-sidebar, .nav-controller, .chat-sidebar ').on('click', function(event) {
      $('.chat-sidebar').toggleClass('focus');
  });

  $(".hide-chat").click(function(){
      $('.chat-sidebar').toggleClass('focus');
  });
  
  $('.tip').tooltip();
  
  /*show image in modal when click*/
  $('body').delegate('.show-in-modal', 'click', function(e){
    $('#modal-show .img-content').html('<img class="img-responsive img-rounded" src="'+$(this).attr('src')+'" />');
    $('#modal-show').modal('show');
    e.preventDefault();
  });
  
  
  // $('.show-in-modal').click(function(e){
//     $('#modal-show .img-content').html('<img class="img-responsive img-rounded" src="'+$(this).attr('src')+'" />');
//     $('#modal-show').modal('show');
//     e.preventDefault();
//   });

  /*chat box*/
  // $(document).on('click', '.chat-sidebar .list-group .list-group-item', function (e) {
 //    $('.chat-window').show();
 //  });

  $(document).on('click', '.icon_close', function (e) {
    $(this).closest('.chat-window').hide();
  });
  
  $(document).on('click', '.panel-heading span.icon_minim', function (e) {
      var $this = $(this);
      if (!$this.hasClass('panel-collapsed')) {
          $this.parents('.panel').find('.panel-body').slideUp();
          $this.addClass('panel-collapsed');
          $this.removeClass('glyphicon-minus').addClass('glyphicon-plus');
      } else {
          $this.parents('.panel').find('.panel-body').slideDown();
          $this.removeClass('panel-collapsed');
          $this.removeClass('glyphicon-plus').addClass('glyphicon-minus');
      }
  });


  /*============= About page ==============*/

  $(".about-tab-menu .list-group-item").click(function(e) {
      e.preventDefault();
      $(this).siblings('a.active').removeClass("active");
      $(this).addClass("active");
      var index = $(this).index();
      $("div.about-tab>div.about-tab-content").removeClass("active");
      $("div.about-tab>div.about-tab-content").eq(index).addClass("active");
  });
});