
$().ready(() => {
    // anti spam
    $('#contact').hover( function() {
        $(this).attr('href', 'mailto:simon1.hampton@gmail.com?subject=[freelance enquiry] ');
    });

    // on image click, read in the href and redirect to it
    $('#portfolio [role=listbox]').children().on('click', function() {
        var href = $(this).data('href');
        if (href)
            window.location.href = href;
    })
});
