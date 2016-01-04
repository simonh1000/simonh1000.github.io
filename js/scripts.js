

$().ready(() => {
    $('#contact').hover( function() {
        $(this).attr('href', 'mailto:simon1.hampton@gmail.com?subject=[freelance enquiry] ');
    });

    $('#portfolio [role=listbox]').children().on('click', function() {
        var href = $(this).data('href');
        if (href)
            window.location.href = href;
    })
})
